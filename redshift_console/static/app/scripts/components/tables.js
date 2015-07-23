var React = window.React = require('react'),
    RouteHandler = require('react-router').RouteHandler,
    TimeAgo = require('./common.js').TimeAgo,
    WaitingForData = require('./common.js').WaitingForData,
    Link = require('react-router').Link,
    helpers = require('../helpers.js');

var SchemasPage = React.createClass({
    render: function() {
        return (
            <div>
                <div className="col-md-12">
                    <RouteHandler />
                </div>
            </div>
        );
    }
});

var TableStatus = React.createClass({
    render: function() {
        var link = "#schemas/" + this.props.schemaName + "/" + this.props.table.name;
        if (this.props.table.total_rows === 0) {
            return (
                <tr>
                    <td className="table-name"><a href={link}>{helpers.truncate(this.props.table.name)}</a></td>
                    <td colSpan="6">Empty</td>
                </tr>
            );
        }

        return (
            <tr>
                <td className="table-name"><a href={link}>{helpers.truncate(this.props.table.name)}</a></td>
                <td>{helpers.formatSize(this.props.table.size_in_mb)}</td>
                <td>{helpers.formatPercentage(this.props.table.percent_sorted)}</td>
                <td>{helpers.formatBool(this.props.table.has_dist_key)}</td>
                <td>{helpers.formatBool(this.props.table.has_sort_key)}</td>
                <td>{helpers.formatBool(this.props.table.has_col_encoding)}</td>
                <td>{helpers.toFixed(this.props.table.pct_skew_across_slices, 2)}%</td>
                <td className={helpers.textClass(this.props.table.pct_slices_populated, 90, 50)}>{helpers.toFixed(this.props.table.pct_slices_populated, 2)}%</td>
            </tr>
        );
    }
});

var SchemaStatusTable = React.createClass({
    render: function() {
        var renderTable = function(schemaName, table) {
            return <TableStatus schemaName={schemaName} table={table} key={table.name} />;
        };

        return (
            <div>
                <h4>{this.props.name}</h4>
                <table className="table table-stripped table-status">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Size (MB)</th>
                            <th>Sorted Area</th>
                            <th>Dist Key</th>
                            <th>Sort Key</th>
                            <th>Column Encodings</th>
                            <th>Distribution Skew</th>
                            <th>Slice Populated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.schema.map(_.partial(renderTable, this.props.name))}
                    </tbody>
                </table>
            </div>
        )
    }
})

var SchemasStatus = React.createClass({
    getInitialState: function() {
        return {'schemas': {}, 'serverLoading': false} ;
    },
    refresh: function() {
        var component = this;

        fetch('/api/schemas').then(function(response) {
            return response.json();
        }).then(function(json) {
            if (_.isEmpty(json.results)) {
                component.setState({'serverLoading': true});
            } else {
                component.setState({'schemas': json.results, 'serverLoading': false});
            }
        });
    },
    componentWillMount: function(){
        this.refresh();
    },
    render: function() {
        var renderSchema = function(schema, name) {
            return (
                <SchemaStatusTable name={name} schema={schema} />
            )
        };

        // Assuming that empty schemas means that there is no data received yet.
        if (this.state.serverLoading) {
            return <WaitingForData onRefresh={this.refresh}/>;
        }

        var publicSchemaElement = false;

        if (this.state.schemas['public'] != undefined) {
            publicSchemaElement = renderSchema(this.state.schemas['public'], 'public');
            delete this.state.schemas['public'];
        }

        return (
            <div>
                {publicSchemaElement}
                {_.map(this.state.schemas, renderSchema)}
            </div>
        );
    }
});

var TableDefinition = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },
    getInitialState: function() {
        var schemaName = this.context.router.getCurrentParams().schema;
        var tableName = this.context.router.getCurrentParams().table;

        return {'metadata': {}, 'columns': [], 'schemaName': schemaName, 'tableName': tableName, 'updatedAt': null};
    },
    componentWillMount: function() {
        var component = this;

        fetch('/api/schemas/' + this.state.schemaName + '/' + this.state.tableName).then(function(response) {
            return response.json();
        }).then(function(json) {
            if (component.isMounted()) {
                component.setState({'metadata': json.definition.metadata,'columns': json.definition.columns, 'updatedAt': json.updated_at});
            }
        });
    },
    render: function() {
        if (_.isEmpty(this.state.columns)) {
            return false;
        }

        var createItem = function(column) {
            var sortKey = "No";
            if (column.sortkey > 0) {
                sortKey = "Yes (" + column.sortkey + ")";
            }

            return (
                <tr>
                    <td>{column.name}</td>
                    <td>{column.type}</td>
                    <td>{column.encoding}</td>
                    <td>{sortKey}</td>
                    <td>{helpers.formatBool(column.distkey)}</td>
                </tr>
            );
        };

        return (
            <div>
                <ol className="breadcrumb">
                  <li><Link to="schemas">Schemas</Link></li>
                  <li>{this.state.schemaName}</li>
                  <li className="active">{this.state.tableName}</li>
                </ol>
                <span className="pull-right badge">Updated: <TimeAgo timestamp={this.state.updatedAt} interval={30000}/></span>
                <p>
                    <strong>Rows:</strong> {this.state.metadata.total_rows.toLocaleString()} ({helpers.formatPercentage(this.state.metadata.percent_sorted)} sorted, {helpers.formatSize(this.state.metadata.size_in_mb)})<br/>
                    <strong>Distribution Skew:</strong> {helpers.toFixed(this.state.metadata.pct_skew_across_slices, 2)}%<br/>
                    <strong>Slices Populated:</strong> {helpers.toFixed(this.state.metadata.pct_slices_populated, 2)}%
                </p>
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>Column Name</th>
                            <th>Type</th>
                            <th>Encoding</th>
                            <th>Sort key</th>
                            <th>Dist Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.columns.map(createItem)}
                    </tbody>
                </table>
            </div>
        );
    }
})

module.exports = {
    'SchemasPage': SchemasPage,
    'SchemasStatus': SchemasStatus,
    'TableDefinition': TableDefinition
};
