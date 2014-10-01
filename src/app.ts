import React = require("react");
var RD = React.DOM;

var App = React.createClass({
    render: function() {
        return RD.div(null, "a yo");
    }
});

document.addEventListener("DOMContentLoaded", function() {
    React.renderComponent(App(), document.body);
}, false );
