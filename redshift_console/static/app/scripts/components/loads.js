var React = window.React = require('react'),
    moment = require('../../bower_components/momentjs/moment.js'),
    RouteHandler = require('../../bower_components/react-router/build/global/ReactRouter.js').RouteHandler,
    TimeAgo = require('./common.js').TimeAgo,
    Sidebar = require('./common.js').Sidebar,
    WaitingForData = require('./common.js').WaitingForData,
    Link = require('../../bower_components/react-router/build/global/ReactRouter.js').Link,
    helpers = require('../helpers.js');


var LoadError = React.createClass({
    render: function (){
        return (
            <tr>
                <td>MyTable</td>
                <td>MyColumn</td>
                <td>MyError</td>
                <td>MyTime</td>
                <td>MyErrorCount</td>
            </tr>
        );
    }
});

var ErrorsTable = React.createClass({
        render: function (){
            return (
                <table>
                    <thead>
                        <th>Table</th>
                        <th>Column</th>
                        <th>Error</th>
                        <th>Time</th>
                        <th>Errors Count</th>
                    </thead>
                    <tbody>
                        <LoadError/>
                    </tbody>
                </table>
            );
        }
    }
);

var LoadsPage = React.createClass({
    render: function() {
        return (
            <div>
                <ErrorsTable />
            </div>
        );
    }
});

module.exports = {
    'LoadsPage': LoadsPage
}


