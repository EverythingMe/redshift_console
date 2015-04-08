var React = window.React = require('react'),
    moment = require('../../bower_components/momentjs/moment.js'),
    RouteHandler = require('../../bower_components/react-router/build/global/ReactRouter.js').RouteHandler,
    TimeAgo = require('./common.js').TimeAgo,
    Sidebar = require('./common.js').Sidebar,
    WaitingForData = require('./common.js').WaitingForData,
    Link = require('../../bower_components/react-router/build/global/ReactRouter.js').Link,
    helpers = require('../helpers.js');

var LoadsPage = React.createClass({
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

var LoadError = React.create

)
