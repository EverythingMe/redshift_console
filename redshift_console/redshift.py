from itertools import chain
import psycopg2
import datetime
import logging
import yaml
import os
import toro
import settings
import re
from tornado.ioloop import IOLoop, PeriodicCallback
from tornado.gen import coroutine, Return
from tornado.concurrent import run_on_executor
from concurrent.futures import ThreadPoolExecutor
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager


with open(os.path.join(os.path.dirname(__file__), './queries.yaml')) as f:
    sql_queries = yaml.load(f)


def _concat_query_text(rows_items, key='id', text_col='query'):
    """
    Queries related tables tend to split the query text over several lines.
    This function concats the text.
    """
    queries = {}
    ret = []
    for row in rows_items:
        queries.setdefault(row[key], []).append(row)

    for query in queries.values():
        query_text = reduce(lambda text, query_data: "{}{}".format(text, query_data[text_col].strip()), query, "")
        query[0][text_col] = query_text.strip()
        ret.append(query[0])

    return ret


class DataFetcher(object):

    # Only one query per connection is possible in psycopg2 async mode
    # so there is no point to have a ThreadPoolExecutor bigger than the
    # connection pool.
    executor = ThreadPoolExecutor(settings.REDSHIFT['connection_pool_max_size'])

    def __init__(self, connection_pool, refresh_interval, io_loop=None, executor=None):
        self.io_loop = io_loop or IOLoop.instance()
        self.executor = executor or self.executor
        self.connection_pool = connection_pool
        self.lock = toro.Lock()
        self.name = self.__class__.__name__

        self.status = "Started"
        self.runtime = 0
        self.refresh_finished_at = None
        self.refresh_started_at = None
        self.refresh_interval = refresh_interval.seconds

        self.periodic_callback = PeriodicCallback(self._refresh, refresh_interval.seconds*1000)

    @contextmanager
    def _get_connection(self):
        """
        Context manager for pool handling
        """
        conn = self.connection_pool.getconn()
        try:
            yield conn
        finally:
            self.connection_pool.putconn(conn)

    @coroutine
    def start(self):
        self.periodic_callback.start()
        yield self._refresh()

    def stop(self):
        self.periodic_callback.stop()

    def get_status(self):
        return {
            'name': self.name,
            'state': self.status,
            'refresh_started_at': self.refresh_started_at,
            'refresh_finished_at': self.refresh_finished_at,
            'runtime': self.runtime,
            'refresh_interval': self.refresh_interval
        }

    @coroutine
    def _refresh(self):
        # Because Tornado runs in a single thread, we can use this locked() safely to verify if this fetcher already
        # runs.
        if self.lock.locked():
            logging.info("%s skipping because already locked.", self.name)
            return

        with (yield self.lock.acquire()):
            self.status = "Fetching data"
            self.refresh_started_at = datetime.datetime.utcnow()

            logging.info("%s starting refresh", self.name)

            yield self.refresh()

            self.status = "Waiting"
            self.refresh_finished_at = datetime.datetime.utcnow()
            delta = self.refresh_finished_at - self.refresh_started_at
            self.runtime = delta.seconds + delta.microseconds/1000000
            self.refresh_started_at = None

            logging.info("%s finished refreshing.", self.name)

    @run_on_executor
    def execute_query(self, query, *args):
        with self._get_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, *args)
                return cursor.fetchall()


    @coroutine
    def refresh(self):
        pass


class Queries(DataFetcher):
    def __init__(self, session, refresh_interval):
        super(Queries, self).__init__(session, refresh_interval)
        self.inflight_queries = {}
        self.inflight_queries_updated_at = None
        self.queries_queue = []
        self.queries_queue_updated_at = None
        self.alerts_updated_at = None

    def _set_cancellation_in_progres(self, pid):
        for q in chain(self.inflight_queries.values(), self.queries_queue):
            if q.get('pid') == int(pid):
                q['cancellation_in_progress'] = True


    @run_on_executor
    def cancel_query(self, pid):
        """
        Since multiple attempts are required in order
        to cancel a query, the connection is blocked until
        that query was canceled.
        """
        with self._get_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                tries = 1
                while tries < int(settings.DATA['max_query_cancelation_retries']):
                    try:
                        self._set_cancellation_in_progres(pid)
                        cursor.execute("CANCEL %s;", (int(pid), ))
                        logging.info("cancelation retry {} out of {} for PID {}".format(tries, settings.DATA['max_query_cancelation_retries'], pid))
                        tries += 1
                    except psycopg2.InternalError:
                        logging.info('successfully canceled {}'.format(pid))
                        return True

                logging.warning('failed to cancel {}'.format(pid))
                return False

    @coroutine
    def refresh(self):
        yield self._fetch_inflight_queries()
        yield self._fetch_query_alerts()
        yield self._fetch_queries_queue()

    @coroutine
    def _fetch_inflight_queries(self):
        inflight_queries = yield self.execute_query(sql_queries['inflight_queries'])
        previous_inflight_queries = self.inflight_queries
        self.inflight_queries = {q['id']: q for q in _concat_query_text(inflight_queries)}

        # copy previous alerts, until we fetch new ones:
        for id, query in self.inflight_queries.iteritems():
            if id in previous_inflight_queries and previous_inflight_queries[id].get('alert', None) is not None:
                query['alert'] = previous_inflight_queries[id]['alert']

            query['cancellation_in_progress'] = False

        self.inflight_queries_updated_at = datetime.datetime.utcnow()

    @coroutine
    def _fetch_query_alerts(self):
        if not self.inflight_queries:
            logging.info("skipping fetching of query alerts, as there are no inflight queries.")
            return

        ids = tuple(self.inflight_queries.keys())
        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(seconds=3600*3)

        alerts_list = yield self.execute_query(sql_queries['query_alerts'], (start_time, end_time, ids))

        alerts = {}
        # assuming events are in ascending order
        # overriding early event with recent per query
        for row in alerts_list:
            alerts.setdefault(row['id'], {'event': row['event'], 'solution': row['solution']})

        for id, alert in alerts.iteritems():
            if id in self.inflight_queries:
                self.inflight_queries[id]['alert'] = {
                    'problem': alert['event'],
                    'solution': alert['solution']
                }

        self.alerts_updated_at = datetime.datetime.utcnow()

    @coroutine
    def _fetch_queries_queue(self):
        queries_queue = yield self.execute_query(sql_queries['queries_queue'])
        self.queries_queue = _concat_query_text(queries_queue)
        self.queries_queue_updated_at = datetime.datetime.utcnow()


class Tables(DataFetcher):
    def __init__(self, session, refresh_interval):
        super(Tables, self).__init__(session, refresh_interval)
        self.updated_at = None
        self.schemas = {}
        self.load_errors = {}
        self.tables_rows_sort_status = {}
        self.table_id_mapping = {}
        self._db_id = None
        self.load_errors_updated_at = None

    def get(self, namespace, table):
        return self.schemas.get(namespace, {}).get(table, None)

    @coroutine
    def _fetch_current_db_id(self):
        """
        db_id is used to limit the querying of STV_TBL_PERM.
        pg_class and pg_namespace are limited to the scope of
        the current connection (and therefore to a single database)
        while STV_TBL_PERM contains info on tables from all databases
        in the cluster.
        """
        with self._get_connection() as connection:
            dbname = re.search("dbname='(\w+)'", connection.dsn).group(1)
            with connection.cursor() as cursor:
                cursor.execute('SELECT OID FROM pg_database WHERE datname=%s', (dbname, ))
                self._db_id = cursor.fetchone()[0]

    def get_schemas(self):
        schemas = {}

        for schema_name, schema in self.schemas.iteritems():
            schemas.setdefault(schema_name, [])

            for name, table in schema.iteritems():
                table_data = table.get('metadata', {})
                table_data.setdefault('total_rows', 0)
                table_data['name'] = name
                schemas[schema_name].append(table_data)

            schemas[schema_name] = list(reversed(sorted(schemas[schema_name], key=lambda t: t.get('size_in_mb', 0))))

        return schemas

    @coroutine
    def refresh(self):
        if not self._db_id:
            yield self._fetch_current_db_id()
        yield self._fetch_schema()
        yield self._fetch_tables_rows_sort_status()
        yield self._fetch_design_status()
        yield self._fetch_load_errors()

    @coroutine
    def _fetch_schema(self):
        results = yield self.execute_query(sql_queries['table_id_mapping'])
        namespaces = list(set(map(lambda r: "'%s'" % r['schema_name'], results)))
        tables_ids = {row.pop('table_id'): row for row in results}
        self.table_id_mapping = tables_ids
        namespaces.insert(0, "'$user'")
        namespaces.insert(1, "'public'")

        search_path_query = 'set search_path to {};'.format(', '.join(namespaces))

        columns = yield self.execute_query(search_path_query + "SELECT * FROM pg_table_def WHERE schemaname NOT IN ('pg_catalog', 'pg_toast', 'information_schema');", namespaces)
        schema = {}
        for col in columns:
            namespace = schema.setdefault(col['schemaname'], {})
            table = namespace.setdefault(col['tablename'], {})
            columns = table.setdefault('columns', [])
            table.setdefault('metadata', self.schemas.get(col['schemaname'], {}).get(col['tablename'], {}).get('metadata', {}))
            columns.append({'name': col['column'],
                            'type': col['type'],
                            'encoding': col['encoding'],
                            'distkey': col['distkey'],
                            'sortkey': col['sortkey']})

        self.schemas = schema
        self.updated_at = datetime.datetime.utcnow()

    @coroutine
    def _fetch_load_errors(self):
        query = sql_queries['table_load_errors']
        load_errors = yield self.execute_query(query)
        for row in load_errors:
            row['table'] = self.table_id_mapping[row['table_id']]['table_name']
            row['schema'] = self.table_id_mapping[row['table_id']]['schema_name']
        self.load_errors = load_errors
        self.load_errors_updated_at = datetime.datetime.utcnow()

    @coroutine
    def _fetch_tables_rows_sort_status(self):
        query = sql_queries['tables_rows_sort_status']
        res = yield self.execute_query(query, (self._db_id,))

        for row in res:
            schema, table_name = self.table_id_mapping[row['table_id']]['schema_name'], \
                                 self.table_id_mapping[row['table_id']]['table_name']


            table = self.get(schema, table_name)
            if table is not None:
                table.setdefault('metadata', {})
                table['metadata']['total_rows'] = row['total_rows']
                table['metadata']['sorted_rows'] = row['sorted_rows']
                table['metadata']['percent_sorted'] = row['percent_sorted']

    @coroutine
    def _fetch_design_status(self):
        result = yield self.execute_query(sql_queries['table_design_status'])
        for row in result:
            table = self.get(row['schemaname'], row['tablename'])
            if table is not None:
                table.setdefault('metadata', {})
                for key in ('has_col_encoding', 'pct_slices_populated', 'size_in_mb', 'pct_skew_across_slices', 'has_sort_key', 'has_dist_key'):
                    table['metadata'][key] = row[key]





