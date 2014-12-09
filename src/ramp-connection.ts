import react = require("react");
import TypedReact = require("typed-react");
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
}

class RampConnectionClass extends TypedReact.Component<RampConnectionProps, RampConnectionState> {
    getInitialState(): RampConnectionState {
        return {
            peers: []
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

        this.setState({
            connection: connection,
        });
    }

    private _disconnect() {
        var hub = this.props.hub;
        var connection = this.state.connection;
        connection.onIdentified.off(null, this);
        connection.onConnected.off(null, this);
        connection.onDisconnected.off(null, this);
        hub.disconnect(this.props.addr);
        this.replaceState(this.getInitialState());
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
        return RD.div(null,
            RD.h3(null, this.props.addr),
            RD.div(null, 
                this.state.connection
                ? RD.button({ onClick: this._disconnect }, "Disconnect")
                : RD.button({ onClick: this._connect }, "Connect"),
                this.state.id ? " ID: " + this.state.id : null
                ),
            RD.div(null, this.state.peers.join(", "))
        );
    }
}

export var RampConnection = react.createFactory(TypedReact.createClass<RampConnectionProps, RampConnectionState>(RampConnectionClass));
