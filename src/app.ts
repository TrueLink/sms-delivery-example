import React = require("react");
import TypedReact = require("typed-react");
import uuid = require("node-uuid");
import hub = require("browser-relay-client/lib/hub");
var RD = React.DOM;

export interface AppProps {
    hub: hub.HubAPI
}

interface AppState {
}

class AppClass extends TypedReact.Component<AppProps, AppState> {
    componentDidMount() {
    } 

    componentWillUnmount() {
    }

    render() {
        var hub = this.props.hub;
        return RD.div(null,
            RD.h1(null, hub.guid),
            hub.connections().map((item) => {
                return RD.div(null, item.endpoint);
                })
            );
    }
}

export var App = React.createFactory(TypedReact.createClass<AppProps, AppState>(AppClass));

window.onload = function () {
    var guid = uuid.v4();
    var instance = hub.Hub.create(guid);
    React.render(App({ hub: instance }), document.body);
};

window.onerror = function () {
    console.log.call(console, arguments);
};
