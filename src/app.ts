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
    routing?: string[][];
}

class AppClass extends TypedReact.Component<AppProps, AppState> {
    getInitialState(): AppState {
        return {
            messages: [],
            contacts: [],
            currentRamps: this.props.ramps,
            routing: []
        };
    }

    private _messageReceived(message: string): void {
        var messages = this.state.messages;
        messages.push(message);
        this.setState({
            messages: messages
        });
    }

    private _routingChanged(table: routing.RoutingTable): void {
        var nodes = table.children;
        var hub = this.props.hub;
        var contacts: string[] = [];

        for (var i = 0; i < nodes.length; i++) {
            var guid = nodes[i];
            if (guid == hub.guid) continue;
            contacts.push(guid);
        }

        this.setState({
            contacts: contacts,
            routing: table.serialize()
        });
    }

    private _sendMessage(event: React.FormEvent) {
        var hub = this.props.hub;
        var form = <HTMLFormElement>event.target;
        var message = <HTMLInputElement>form.elements["message"];
        var destination = <HTMLInputElement>form.elements["dest"];
        if (!destination) return false;

        this._messageReceived(message.value);
        hub.sendTo(destination.value, message.value);
        message.value = message.defaultValue;
        event.preventDefault();
        return false;
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
            RD.h1(null, "GUID: ", RD.span(null, hub.guid)),
            RD.textarea({
                id: "log",
                value: this.state.messages.join("\n"),
                readOnly: true
            }),
            RD.form({ onSubmit: this._sendMessage },
                this.state.contacts.map((guid) => {
                    return RD.div(null,
                        RD.label({ "for": guid }, guid),
                        RD.input({ type: "radio", name: "dest", id: guid, value: guid })
                        );
                }),
                RD.input({
                    type: "text",
                    name: "message"
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
            }),
            RD.table(null, 
                RD.caption(null, "Routing table"),
                RD.tbody(null, 
                    this.state.routing.map((row) => {
                        return RD.tr(null,
                            RD.td(null, row[0]),
                            RD.td(null, row[2])
                            );
                    })
                )
            )
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
