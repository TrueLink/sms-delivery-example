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
        messages.push("< " + message);
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

    private _addRamp(event: React.FormEvent) {
        event.preventDefault();

        var hub = this.props.hub;
        var form = <HTMLFormElement>event.target;
        var addr = <HTMLInputElement>form.elements.item("addr");
        if (!addr.value) return false;

        var ramps = this.state.currentRamps;
        ramps.push(addr.value);

        this.setState({
            currentRamps: ramps
        });

        form.reset();

        return false;
    }

    private _sendMessage(event: React.FormEvent) {
        event.preventDefault();

        var hub = this.props.hub;
        var form = <HTMLFormElement>event.target;
        var message = <HTMLInputElement>form.elements.item("message");
        var destination = <HTMLInputElement>form.elements.item("dest");
        if (!destination) return false;
        if (!destination.value) return false;

        var messages = this.state.messages;
        messages.push("> " + message.value);
        this.setState({
            messages: messages
        });

        hub.sendTo(destination.value, message.value);
        message.value = message.defaultValue;
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
        hub.onRoutingChanged.off(this._routingChanged, this);
    }

    render() {
        var hub = this.props.hub;
        return RD.div(null,
            RD.h1(null, "GUID: ", RD.span({
                className: "guid"
            }, hub.guid)),
            RD.form({
                onSubmit: this._sendMessage,
                className: "submit-form"
            },
                RD.table({ className: "layout" },
                    RD.tbody(null,
                        RD.tr(null,
                            RD.td(null,
                                RD.textarea({
                                    id: "log",
                                    value: this.state.messages.join("\n"),
                                    readOnly: true
                                })
                                ),
                            RD.td(null,
                                this.state.contacts.map((guid, index) => {
                                    var id = "contact-" + index;
                                    return RD.div(null,
                                        RD.label({ className: "guid", htmlFor: id }, guid),
                                        RD.input({ type: "radio", name: "dest", id: id, value: guid })
                                        );
                                })
                                )
                            )
                        )
                    ),
                RD.input({
                    type: "text",
                    name: "message"
                }),
                RD.input({
                    type: "submit",
                    value: "Send"
                })
            ),
            RD.h2(null, "Ramp servers"),
            this.state.currentRamps.map((addr) => {
                return rampConnection.RampConnection({
                    key: addr,
                    hub: hub,
                    addr: addr
                });
            }),
            RD.form({
                onSubmit: this._addRamp
            },
                RD.input({ type: "text", name: "addr" }),
                RD.input({ type: "submit", value: "Add" })
            ),
            RD.h2(null, "Routing table"),
            RD.table({ className: "routing" },
                RD.thead(null,
                    RD.tr(null,
                        RD.th(null, "Origin"),
                        RD.th(null, "Endpoint")
                        )
                    ),
                RD.tbody(null,
                    this.state.routing.map((row) => {
                        return RD.tr(null,
                            RD.td({ className: "guid" }, row[0]),
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
