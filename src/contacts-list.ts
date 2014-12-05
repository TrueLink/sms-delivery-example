import React = require("react");
import TypedReact = require("typed-react");
import contact = require("contact")

var RD = React.DOM;

export interface ContactsListProps {
    guids: string[];
}

interface ContactsListState {
}

class ContactsListClass extends TypedReact.Component<ContactsListProps, ContactsListState> {
    render() {
        return RD.div(null,
            this.props.guids.map((guid) => contact.Contact({ guid: guid }))
            );
    }
} 

export var ContactsList = React.createFactory(TypedReact.createClass<ContactsListProps, ContactsListState>(ContactsListClass));