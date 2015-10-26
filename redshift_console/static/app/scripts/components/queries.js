var React = window.React = require('react'),
    moment = require('../../bower_components/momentjs/moment.js'),
    _ = require('../../bower_components/underscore/underscore.js'),
    RouteHandler = require('react-router').RouteHandler,
    TimeAgo = require('./common.js').TimeAgo,
    Sidebar = require('./common.js').Sidebar;

var QueriesPage = React.createClass({
    getInitialState: function() {
        return {
            inflightQueries: {
                queries: [],
                updatedAt: null
            },
            queriesQueue: {
                queries: [],
                updatedAt: null
            },
            queriesHistory: {
                queries: [],
                updatedAt: null
            }
        };
    },
    refresh: function() {
        var component = this;

        fetch('/api/queries/inflight').then(function(response) {
            return response.json();
        }).then(function(json) {
            if (component.isMounted()) {
                component.setState({inflightQueries: { queries: _.sortBy(json.inflight_queries, 'id'), updatedAt: json.updated_at}});
                setTimeout(component.refresh, 10000);
            }
        });

        fetch('/api/queries/history').then(function(response) {
            return response.json();
        }).then(function(json) {
            if (component.isMounted()) {
                component.setState({queriesHistory: { queries: _.sortBy(json.queries_history, 'endtime'), updatedAt: json.updated_at}});
                setTimeout(component.refresh, 100000);
            }
        });

        fetch('/api/queries/queue').then(function(response) {
            return response.json();
        }).then(function(json) {
            if (component.isMounted()) {
                component.setState({queriesQueue: { queries: json.queries, updatedAt: json.updated_at}});
            }
        });
    },
    componentWillMount: function() {
        this.refresh();
    },
    render: function() {
        var links = [
            {
                name: <span>In Flight <span className="badge">{this.state.inflightQueries.queries.length}</span></span>,
                route: 'inflight'
            },
            {
                name: <span>Queries History <span className="badge">{this.state.queriesHistory.queries.length}</span></span>,
                route: 'queries_history'
            },
            {
                name: <span>Queries Queue <span className="badge">{this.state.queriesQueue.queries.length}</span></span>,
                route: 'queries_queue'
            }
        ]
        return (
            <div>
                <Sidebar links={links} />
                <div className="col-md-10">
                    <RouteHandler inflightQueries={this.state.inflightQueries} queriesQueue={this.state.queriesQueue} queriesHistory={this.state.queriesHistory}/>
                </div>
            </div>
        );
    }
});

var InflightQueries = React.createClass({
    render: function() {
        var createItem = function(query) {
            return <Query key={query.query} query={query} />;
        };
        return (
            <div>
                <div className="pull-right badge">Updated: <TimeAgo timestamp={this.props.inflightQueries.updatedAt} interval={5000} /></div>
                <table className="table table-stripped queries">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>PID</th>
                            <th>User</th>
                            <th>Run Time</th>
                            <th>Query Text</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.inflightQueries.queries.map(createItem)}
                    </tbody>
                </table>
            </div>
        );
    }
})

var QueriesQueue = React.createClass({
    render: function() {
        var createItem = function(query) {
            return <Query key={query.query} query={query} />;
        };
        return (
            <div>
                <div className="pull-right badge">Updated: <TimeAgo timestamp={this.props.queriesQueue.updatedAt} interval={5000} /></div>
                <table className="table table-stripped queries">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>PID</th>
                            <th>User</th>
                            <th>Wait Time</th>
                            <th>Query Text</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.queriesQueue.queries.map(createItem)}
                    </tbody>
                </table>
            </div>
        );
    }
})

var QueriesHistory = React.createClass({
    render: function() {
        var createItem = function(query) {
            return <QueryHistory key={query.query} query={query} />;
        };
        return (
          <div>
                <div className="pull-right badge">Updated: <TimeAgo timestamp={this.props.queriesHistory.updatedAt} interval={5000} /></div>
                <table className="table table-stripped queries">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>DB</th>
                            <th>Query</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.queriesHistory.queries.map(createItem)}
                    </tbody>
                </table>
            </div>
        );
    }
})

var QueryExecutionTime = React.createClass({
    componentWillMount: function() {
        this.timer = setInterval(function(component) {
            component.forceUpdate();
        }, 1000, this);
    },
    componentWillUnmount: function() {
        clearInterval(this.timer);
    },
    render: function() {
        var now = moment.utc();
        var time = moment.utc(this.props.time);
        var delta = (moment() - time) / 1000.0;
        var warning = "";
        if (delta > 60 * 60) {
            warning = <span className="badge time-danger"><i className="fa fa-exclamation-circle"></i></span>
        } else if (delta > 10 * 60) {
            warning = <span className="badge time-warning"><i className="fa fa-exclamation-circle"></i></span>
        }

        var deltaString = now.subtract(time, 'ms').format('HH:mm:ss');

        return <div>{deltaString} {warning}</div>
    }
});

var CancelButton = React.createClass({
    getInitialState: function() {
        return {'cancelling': false};
    },
    handleClick: function() {
        this.setState({'cancelling' : true });
        fetch('/api/queries/cancel/' + this.props.pid, {method: 'post'}).then(function(response) {
            console.log(response);
        }).catch(function(error) {
            console.log(error);
        })
    },
    render: function() {
        var spinner = "";
        var cancelling = this.state.cancelling || this.props.cancellationInProgress;
        if (cancelling) {
            var spinner = <span className="fa fa-cog fa-spin"></span>;
        }

        return <button className="btn btn-warning btn-xs" onClick={this.handleClick} disabled={cancelling}>{spinner} Cancel</button>;
    }
});

var AlertsButton = React.createClass({
    handleClick: function() {
        alert(this.props.query.alert.problem + "\n" + this.props.query.alert.solution);
    },
    render: function() {
        if (this.props.query.alert === undefined) {
            return false;
        }

        return (
            <button className="btn btn-default btn-xs" onClick={this.handleClick}><i className="fa fa-medkit"></i></button>
        );
    }
});

var Query = React.createClass({
    getInitialState: function() {
        return {className: 'query collapsed'};
    },
    handleMouseEnter: function() {
        var component = this;
        this.expandTimer = setTimeout(function() {
            component.setState({className: 'query'});
        }, 1000);
    },
    handleMouseLeave: function() {
        if (this.expandTimer) {
            clearTimeout(this.expandTimer);
            this.expandTimer = undefined;
        }
        this.setState({className: 'query collapsed'});
    },
    render: function() {
        return (
            <tr>
                <td>{this.props.query.id}</td>
                <td>{this.props.query.pid}</td>
                <td>{this.props.query.username}</td>
                <td><QueryExecutionTime time={this.props.query.timestamp} /></td>
                <td className={this.state.className} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
                    {this.props.query.query}
                </td>
                <td>
                    <div className="btn-group" role="group">
                        <CancelButton pid={this.props.query.pid} cancellationInProgress={this.props.query.cancellation_in_progress} />
                        <AlertsButton query={this.props.query} />
                    </div>
                </td>
            </tr>
        );
    }
});

var QueryHistory = React.createClass({
    getInitialState: function() {
        return {className: 'query collapsed'};
    },
    render: function() {
        return (
            <tr>
                <td>{this.props.query.id}</td>
                <td>{this.props.query.db}</td>
                <td>{this.props.query.query}</td>
            </tr>
        );
    }
});


module.exports = {
    'QueriesPage': QueriesPage,
    'InflightQueries': InflightQueries,
    'QueriesQueue': QueriesQueue,
    'QueriesHistory': QueriesHistory
}
