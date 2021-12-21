import React, { Component } from 'react';

class Dashboard extends Component {

    constructor(props){
        super(props);

        this.state = {
            to: '',
            contacts: [],
            messages: []
        }
    
        this.logout = this.logout.bind(this);
        this.addContact = this.addContact.bind(this);
        this.populateContacts = this.populateContacts.bind(this);
        this.updateTo = this.updateTo.bind(this);
        this.populateMessages = this.populateMessages.bind(this);
        this.sendMessage = this.sendMessage.bind(this);

    }

    componentDidMount(){
        this.populateContacts()
    }

    logout(){
        localStorage.clear();
        window.location.href = "/welcome";
    }

    async addContact(){
        const currentUser = localStorage.getItem('user')
        const potentialContact = document.getElementById('contactSearch').value

        console.log("wanna add " + potentialContact)

        const result = await fetch('http://localhost:3333/api/addcontact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                currentUser,
                potentialContact
            })
        }).then((res) => res.json())
        alert('add')

        if(result.status === 'ok'){
            this.populateContacts()
            alert('User successfully added')
        }else{
            alert(result.error)
        }
    }

    async populateContacts(){

        const currentUser = localStorage.getItem('user')
        const result = await fetch('http://localhost:3333/api/getcontacts', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
            body: JSON.stringify({
                currentUser
            })
        }).then((res) => res.json())

        if(result.status === 'ok'){
            const retrievedContacts = result.data
            console.log(retrievedContacts[0])
            this.setState({
                contacts: retrievedContacts
            })
            console.log('contacts updated')
        }else{
            alert(result.error)
        }
    }

    async populateMessages(){
        const currentUser = localStorage.getItem('user')
        const toUser = this.state.to

        const result = await fetch('http://localhost:3333/api/getmessages', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
            body: JSON.stringify({
                currentUser,
                toUser
            })
        }).then((res) => res.json())

        if(result.status === 'ok'){
            const newMessages = result.data
            this.setState({
                messages: newMessages
            })
            console.log('contacts updated')
        }else{
            alert(result.error)
        }
    }

    updateTo(e){
        console.log(e.target)
        const newTo = e.target.innerHTML
        this.setState({
            to: newTo
        })
        console.log('updated to to '+ newTo)
    }

    async sendMessage(){
        const currentUser = localStorage.getItem('user')
        const toUser = this.state.to

        const result = await fetch('http://localhost:3333/api/sendmessage', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            },
            body: JSON.stringify({
                currentUser,
                toUser
            })
        }).then((res) => res.json())

        if(result.status === 'ok'){
            console.log('contacts updated')
        }else{
            alert(result.error)
        }
    }

    render() {
        return (
            <div>
                <button onClick={this.logout}>
                    Logout
                </button>
                <br></br>
                YO welcome to the dashboard 
                {" " + localStorage.getItem('user')}
                <br></br>
                <input type="text" id="contactSearch"></input>
                <button onClick={this.addContact}>Add Contact</button>
                <br></br>
                <h1>Contact List</h1>
                <ul>
                    {this.state.contacts.map(function(username, i){
                        return <li key={i} onClick={this.updateTo}> {username}</li>;
                    }, this)}
                </ul>
                <br></br>
                <h1>Messages between you and {this.state.to}</h1>
                <ul>
                    {this.state.messages.map(function(content, i){
                        return <li key={i} onClick={this.updateTo}> {content}</li>;
                    }, this)}
                </ul>
                <input type="text" id="messaageContent"></input>
                <button>Send Message</button>
            </div>
        );
    }
}



export default Dashboard;