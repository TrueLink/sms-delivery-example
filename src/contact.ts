import React = require("react");
import TypedReact = require("typed-react");

var RD = React.DOM;

export interface ContactProps {
    guid: string;
}

interface ContactState {
}

class ContactClass extends TypedReact.Component<ContactProps, ContactState> {
    render() {
        return RD.div(null, [
            RD.label(null, this.props.guid),
            RD.input({ type: "radio", value: this.props.guid }),
        ]);
    }
}

export var Contact = React.createFactory(TypedReact.createClass<ContactProps, ContactState>(ContactClass));
