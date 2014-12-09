import react = require("react");
import TypedReact = require("typed-react");
import uuid = require("node-uuid");
import client = require("browser-relay-client");
import routing = require("browser-relay-client/lib/routing");
import hub = require("browser-relay-client/lib/hub");
import rampConnection = require("./ramp-connection");
var RD = react.DOM;

export interface AppProps {
    hub: hub.HubAPI
    ramps?: string[];
}

interface AppState {
    messages?: string[];
    contacts?: string[];
    currentRamps?: string[];
}

class AppClass extends TypedReact.Component<AppProps, AppState> {
    getInitialState(): AppState {
        return {
            messages: [],
            contacts: [],
            currentRamps: this.props.ramps
        };
    }

    private _messageReceived(message: string): void {
        var messages = this.state.messages;
        messages.push(message);
        this.setState({ messages: messages });
    }

    private _routingChanged(table: routing.RoutingTable): void {
        var nodes = table.children;
        var hub = this.props.hub;
        var contacts = this.state.contacts;

        for (var i = 0; i < nodes.length; i++) {
            var guid = nodes[i];
            if (guid == hub.guid) continue;
            contacts.push(guid);
        }

        this.setState({ contacts: contacts });
    }

    private _sendMessage(event: React.FormEvent) {
        var messageInput = <HTMLInputElement>this.refs["chat-message"].getDOMNode();
        //var destinationInput = <HTMLSelectElement>this.refs[""].getDOMNode();
        var message: string = messageInput.value;
        //var destination: string = destinationInput.value;
        this._messageReceived(message);
        var form = <HTMLFormElement>event.target;
        form.reset();
        event.preventDefault();
    }

    componentDidMount() {
        var hub = this.props.hub;
        hub.onMessage.on(this._messageReceived, this);
        hub.onRoutingChanged.on(this._routingChanged, this);
    }

    componentWillUnmount() {
        var hub = this.props.hub;
        hub.onMessage.off(this._messageReceived, this);
    }

    render() {
        var hub = this.props.hub;
        return RD.div(null,
            RD.h1(null, hub.guid),
            RD.textarea({
                id: "log",
                value: this.state.messages.join("\n"),
                readOnly: true
            }),
            hub.connections().map((item) => {
                return RD.div(null, item.endpoint);
            }),
            RD.form({ onSubmit: this._sendMessage },
                RD.input({
                    type: "text",
                    ref: "chat-message"
                }),
                RD.input({
                    type: "submit",
                    value: "Send"
                })
                ),
            this.state.currentRamps.map((addr) => {
                return rampConnection.RampConnection({
                    key: addr,
                    hub: hub,
                    addr: addr
                });
            })
        );
    }
}

export var App = react.createFactory(TypedReact.createClass<AppProps, AppState>(AppClass));

window.addEventListener("load", function () {
    var guid = uuid.v4();
    var instance = hub.Hub.create(guid);
    var app = App({
        hub: instance,
        ramps: [
            "ws://127.0.0.1:20500/",
            "ws://127.0.0.1:20501/"
        ]
    });
    react.render(app, document.body);
});

window.addEventListener("error", function () {
    console.log.call(console, arguments);
});
