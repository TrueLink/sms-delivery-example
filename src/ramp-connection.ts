import react = require("react");
import TypedReact = require("typed-react");
import uuid = require("node-uuid");
import hub = require("browser-relay-client/lib/hub");
import connection = require("browser-relay-client/lib/connection");
import wsConn = require("browser-relay-client/lib/websocket-connection");

var RD = react.DOM;

export interface RampConnectionProps {
    addr: string;
    hub: hub.HubAPI;
}

interface RampConnectionState {
    id?: string;
    connection?: wsConn.WebSocketConnectionAPI;
    peers?: string[];
    uid?: string;
}

class RampConnectionClass extends TypedReact.Component<RampConnectionProps, RampConnectionState> {
    getInitialState(): RampConnectionState {
        return {
            peers: [],
            uid: uuid.v4()
        };
    }

    private _connectionIdentified(data: connection.IdentificationData) {
        this.setState({
            id: data.endpoint
        });
    }

    private _peerConnected(id: string) {
        var peers = this.state.peers;
        var index = peers.indexOf(id);
        if (index >= 0) return;
        peers.push(id);
        this.setState({
            peers: peers.sort()
        });
    }

    private _peerDisconnected(id: string) {
        var peers = this.state.peers;
        var index = peers.indexOf(id);
        if (index == -1) return;
        peers.splice(index, 1);
        this.setState({
            peers: peers
        });
    }

    private _connect() {
        var hub = this.props.hub;
        var connection = hub.connect(this.props.addr);
        connection.onIdentified.on(this._connectionIdentified, this);
        connection.onConnected.on(this._peerConnected, this);
        connection.onDisconnected.on(this._peerDisconnected, this);
        connection.onClose.on(this._disconnected, this);

        this.setState({
            connection: connection,
        });
    }

    private _disconnected() {
        var connection = this.state.connection;
        connection.onIdentified.off(null, this);
        connection.onConnected.off(null, this);
        connection.onDisconnected.off(null, this);
        this.replaceState(this.getInitialState());
    }

    private _disconnect() {
        var hub = this.props.hub;
        hub.disconnect(this.props.addr);
    }

    componentWillUnmount() {
        var hub = this.props.hub;
        var connection = this.state.connection;
        if (connection) {
            connection.onIdentified.off(null, this);
            connection.onConnected.off(null, this);
            connection.onDisconnected.off(null, this);
        }
    }

    render() {
        var addrId = "ramp-addr-" + this.state.uid;
        var connId = "conn-id-" + this.state.uid;
        return RD.div({
            className: "connection"
        },
            this.state.connection
            ? RD.button({ onClick: this._disconnect }, "Disconnect")
            : RD.button({ onClick: this._connect }, "Connect"),
            RD.table(null, 
                RD.tbody(null,
                    RD.tr(null, 
                        RD.td(null, RD.label({
                            htmlFor: addrId
                        }, "Address")),
                        RD.td(null, RD.input({
                            id: addrId,
                            readOnly: true,
                            value: this.props.addr
                        }))
                        ),
                    RD.tr(null,
                        RD.td(null, RD.label({
                            htmlFor: connId
                        }, "ID")),
                        RD.td(null, RD.input({
                            id: connId,
                            readOnly: true,
                            value: this.state.id
                        }))
                        ),
                    RD.tr(null,
                        RD.td(null, "Peers"),
                        RD.td(null, this.state.peers.join(", "))
                        )
                )
            )
        );
    }
}

export var RampConnection = react.createFactory(TypedReact.createClass<RampConnectionProps, RampConnectionState>(RampConnectionClass));
