import json
import os
import datetime
import tornado.web
import tornado.auth
import psycopg2.pool
from tornado import gen
from redshift_console import settings
from redshift_console import redshift

connection_pool = psycopg2.pool.ThreadedConnectionPool(settings.REDSHIFT['connection_pool_min_size'], settings.REDSHIFT['connection_pool_max_size'], settings.REDSHIFT['connection_string'])
queries = redshift.Queries(connection_pool, datetime.timedelta(seconds=int(settings.DATA['inflight_refresh_interval'])))
tables = redshift.Tables(connection_pool, datetime.timedelta(seconds=int(settings.DATA['tables_refresh_interval'])))

queries.start()
tables.start()


def handle_default(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    raise TypeError('{} is not JSON serializeable'.format(obj))


class BaseHandler(tornado.web.RequestHandler):
    def prepare(self):
        if self.request.headers.get("Content-Type", "").startswith("application/json"):
            self.json_args = json.loads(self.request.body)
        else:
            self.json_args = None

    def on_finish(self):
        pass

    def write_json(self, response):
        response = json.dumps(response, default=handle_default)
        self.set_header("Content-Type", "application/json; charset=UTF-8")
        self.write(response)


class TableDefinitionHandler(BaseHandler):
    @gen.coroutine
    def get(self, schema_name, table_name):
        definition = tables.get(schema_name, table_name)
        self.write_json({'definition': definition, 'updated_at': tables.updated_at})


class TablesDesignStatusHandler(BaseHandler):
    @gen.coroutine
    def get(self):
        result = tables.get_schemas()
        self.write_json({'results': result})


class SchemasHandler(BaseHandler):
    def get(self):
        results = tables.get_schemas()
        self.write_json({'results': results})


class QueriesInflightHandler(BaseHandler):
    def get(self):
        self.write_json({'inflight_queries': queries.inflight_queries.values(),
                         'updated_at': queries.inflight_queries_updated_at})


class QueriesQueueHandler(BaseHandler):
    def get(self):
        self.write_json({'queries': queries.queries_queue,
                         'updated_at': queries.queries_queue_updated_at})


class QueriesCancelHandler(BaseHandler):
    @gen.coroutine
    def post(self, pid):
        result = yield queries.cancel_query(pid)
        self.write({'success': result})


class LoadErrorsHandler(BaseHandler):
    def get(self):
        self.write_json(tables.load_errors)


class StatusHandler(BaseHandler):
    def get(self):
        status = [
            tables.get_status(),
            queries.get_status()
        ]
        self.write_json({'fetchers': status})


class MainHandler(BaseHandler):
    def get(self, *args):
        self.render("index.html")


def create_app(debug):
    static_assets_path = os.path.join(os.path.dirname(__file__), settings.API['static_assets_path'])

    return tornado.web.Application([(r"/", MainHandler),
                                    (r"/api/queries/inflight$", QueriesInflightHandler),
                                    (r"/api/queries/queue$", QueriesQueueHandler),
                                    (r"/api/queries/cancel/(.*)$", QueriesCancelHandler),
                                    (r"/api/schemas$", SchemasHandler),
                                    (r"/api/schemas/(.*)/(.*)$", TableDefinitionHandler),
                                    (r"/api/tables/(.*)/(.*)$", TableDefinitionHandler),
                                    (r"/api/tables/design_status$", TablesDesignStatusHandler),
                                    (r"/api/copy/errors$", LoadErrorsHandler),
                                    (r"/api/status$", StatusHandler),
                                    (r"/(.*)", tornado.web.StaticFileHandler, {"path": static_assets_path})],
                                   template_path=static_assets_path,
                                   static_path=static_assets_path,
                                   debug=debug,
                                   cookie_secret=settings.API['cookie_secret'],
                                   compress_response=True
                                   )
