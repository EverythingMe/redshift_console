#!/usr/bin/env python
import click
import tornado
import tornado.log
from redshift_console import settings, app


@click.group()
def cli():
    pass


@cli.command(help="Start the web server")
@click.option('--host', default="0.0.0.0", help='Host to listen on')
@click.option('--port', default=5000, help='Port to bind with')
@click.option('--debug', is_flag=True, help='Run with debug mode (auto code reload, verbose errors)')
def runserver(host, port, debug):
    print "Starting server on port {} (debug mode: {}).".format(port, debug)
    tornado.ioloop.IOLoop.instance().set_blocking_log_threshold(0.5)
    tornado.log.enable_pretty_logging()
    application = app.create_app(debug)
    application.listen(port)
    tornado.ioloop.IOLoop.instance().start()


@cli.command(help="Show settings")
def check_settings():
    from types import ModuleType

    for name in dir(settings):
        item = getattr(settings, name)
        if not callable(item) and not name.startswith("__") and not isinstance(item, ModuleType):
            if isinstance(item, dict):
                print "{}: ".format(name)
                for k, v in item.iteritems():
                    print "  {} = {}".format(k, v)
            else:
                print "  {} = {}".format(name, item)


if __name__ == '__main__':
    cli()
