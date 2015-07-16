var React = require('react'),
    Link = require('react-router').Link,
    moment = require('../../bower_components/momentjs/moment.js');


var WaitingForData = React.createClass({
    render: function() {
        return (
            <div className="jumbotron">
              <h3>Waiting for data to load.</h3>
              <p>
                  <a className="btn btn-primary" role="button" onClick={this.props.onRefresh}>Retry</a>&nbsp;
                  <Link to="status" className="btn btn-default" role="button">Check Status</Link>
              </p>
            </div>
        )
    }
})

var TimeAgo = React.createClass({
    componentWillMount: function() {
        this.timer = setInterval(function(component) {
            component.forceUpdate();
        }, this.props.interval, this);
    },
    componentWillUnmount: function() {
        clearInterval(this.timer);
    },
    render: function() {
        if (this.props.timestamp == null && this.props.alternate === undefined) {
            return false
        } else if (this.props.timestamp == null) {
            return <span>{this.props.alternate}</span>
        }

        return <span>{moment.utc(this.props.timestamp).fromNow()}</span>
    }
});

var Sidebar = React.createClass({
    contextTypes: {
        router: React.PropTypes.func
    },
    render: function() {
        var createLink = function(link) {
            return <li key={link.route} role="presentation" className={this.context.router.isActive(link.route) ? 'active' : ''}><Link to={link.route}>{link.name}</Link></li>
        }.bind(this);

        return (
            <div className="col-md-2">
                <ul className="nav nav-pills nav-stacked">
                    {this.props.links.map(createLink)}
                </ul>
            </div>
        )
    }
});


module.exports = {
    'TimeAgo': TimeAgo,
    'Sidebar': Sidebar,
    'WaitingForData': WaitingForData
}
