var React = window.React = require('react'),
    RouteHandler = require('react-router').RouteHandler,
    TimeAgo = require('./common.js').TimeAgo,
    Sidebar = require('./common.js').Sidebar;


var LoadError = React.createClass({
    render: function (){
        return (
            <tr>
                <td>{this.props.error.table}</td>
                <td>{this.props.error.column}</td>
                <td>{this.props.error.error}</td>
                <td>{this.props.error.time}</td>
                <td>{this.props.error.errors_count}</td>
            </tr>
        );
    }
});

var ErrorsTable = React.createClass({
        render: function (){
            var createItem = function(error){
                return <LoadError error={error}/>;
            };
            return (
                <div>
                    <div className="pull-right badge">Updated: <TimeAgo timestamp={this.props.loadErrors.updatedAt} interval={5000} /></div>
                    <table className="table">
                        <thead>
                            <th>Table</th>
                            <th>Column</th>
                            <th>Error</th>
                            <th>Time</th>
                            <th>Errors Count</th>
                        </thead>
                        <tbody>
                        {this.props.loadErrors.errors.map(createItem)}
                        </tbody>
                    </table>
                </div>
            );
        }
    }
);

var LoadsPage = React.createClass({
    getInitialState: function() {
        return {loadErrors: {
            errors:[],
            updatedAt: null
            }
        };
    },
    refresh: function() {
        var component = this;
        fetch('/api/copy/errors').then(function(response) {
            return response.json();}
        ).then(function(jsonObj) {
            if (component.isMounted()) {
                component.setState({loadErrors:{errors: jsonObj.errors, updatedAt: jsonObj.updated_at}});
                setTimeout(component.refresh, 10000)
            }
        });

    },
    componentWillMount: function() {
        this.refresh();
    },
    render: function() {
         var links = [
            {
                name: <span>Errors <span className="badge">{this.state.loadErrors.errors.length}</span></span>,
                route: 'errors'
            }
        ]
        return (
            <div>
                <Sidebar links={links} />
                <div className="col-md-10">
                    <RouteHandler loadErrors={this.state.loadErrors} />
                </div>
            </div>
        );
    }
});

module.exports = {
    'LoadsPage': LoadsPage,
    'ErrorsTable': ErrorsTable
}
