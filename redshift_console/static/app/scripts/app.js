/** @jsx React.DOM */

var React = window.React = require('react'),
    queries = require('./components/queries.js'),
    tables = require('./components/tables.js'),
    TimeAgo = require('./components/common.js').TimeAgo,
    Router = require('../bower_components/react-router/build/global/ReactRouter.js');

var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;
var Route = Router.Route;
var RouteHandler = Router.RouteHandler;
var Redirect = Router.Redirect;

var App = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },
    render: function () {
        return (
            <div>
                <nav className="navbar navbar-inverse navbar-fixed-top">
                    <div className="container-fluid">
                        <div className="navbar-header">
                            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar-collapse">
                                <span className="sr-only">Toggle navigation</span>
                                <span className="icon-bar"></span>
                                <span className="icon-bar"></span>
                                <span className="icon-bar"></span>
                            </button>
                            <a className="navbar-brand" href="#">Redshift Console</a>
                        </div>

                        <div className="collapse navbar-collapse" id="navbar-collapse">
                            <ul className="nav navbar-nav">
                                <li><a href="#">Home</a></li>
                                <li className={this.context.router.isActive('queries') ? 'active' : ''}><Link to="queries">Queries</Link></li>
                                <li className={this.context.router.isActive('schemas') ? 'active' : ''}><Link to="schemas">Schemas</Link></li>
                                <li className={this.context.router.isActive('status') ? 'active' : ''}><Link to="status">Status</Link></li>
                            </ul>
                        </div>
                    </div>
                </nav>

                <div className="container-fluid">
                    <RouteHandler/>
                </div>
            </div>
        );
    }
});

var StatusPage = React.createClass({
    getInitialState: function() {
        return {'fetchers': []}
    },
    componentWillMount: function() {
        var component = this;

        fetch('/api/status').then(function(response) {
            return response.json();
        }).then(function(json) {
            component.setState(json);
        });
    },
    render: function() {
        var renderFetcher = function(fetcher) {
            return (
                <tr>
                    <td>{fetcher.name}</td>
                    <td>{fetcher.state}</td>
                    <td>{fetcher.refresh_interval} seconds</td>
                    <td><TimeAgo timestamp={fetcher.refresh_started_at} alternate="Not Running"/></td>
                    <td><TimeAgo timestamp={fetcher.refresh_finished_at} alternate="Still Running"/> ({fetcher.runtime}sec)</td>
                </tr>
            )
        }
        return (
            <div>
                <div className="row">
                    <div className="col-md-12">
                        <table className="table table-stripped">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>State</th>
                                    <th>Refresh Interval</th>
                                    <th>Last Refresh Started At</th>
                                    <th>Last Refresh Finished At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {this.state.fetchers.map(renderFetcher)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
});

var routes = (
    <Route name="app" path="/" handler={App}>
        <Route name="queries" handler={queries.QueriesPage}>
            <Route name="inflight" handler={queries.InflightQueries} />
            <Route name="queries_queue" path="queue" handler={queries.QueriesQueue} />
            <Redirect from="/queries" to="/queries/inflight" />
        </Route>
        <Route name="schemas" handler={tables.SchemasPage}>
            <Route name="schemas_status" path="status" handler={tables.SchemasStatus}/>
            <Route name="table_definition" path=":schema/:table" handler={tables.TableDefinition}/>
            <Redirect from="/schemas" to="/schemas/status" />
        </Route>
        <Route name="status" handler={StatusPage} />
        <Redirect from="/" to="/queries/inflight" />
    </Route>
);

Router.run(routes, function (Handler) {
    React.render(<Handler/>, document.body);
});
