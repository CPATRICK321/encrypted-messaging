import React, { Component } from 'react';
// import { io } from 'socket.io-client'
import {socket} from "./service/socket"

// socket.connect()
const crypto = require('asymmetric-crypto')


class Dashboard extends Component {

    constructor(props){
        super(props);

        this.state = {
            to: '',
            contacts: [],
            messages: [],
            myRSA: {},
            myState: 0
        }
    
        this.logout = this.logout.bind(this);
        this.addContact = this.addContact.bind(this);
        this.populateContacts = this.populateContacts.bind(this);
        this.updateTo = this.updateTo.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.createRSApair = this.createRSApair.bind(this);

    }

    componentDidMount(){
        this.populateContacts()
        socket.on('hi', content => {
            alert("YAYYYYYYYYYYYYY")
        })
        socket.on('set-state', content => {
            alert("SETTING STATE")
            const stateEncrypted = content.stateEncrypted
            const serverPublicKey = content.serverPublicKey
            const mySecretKey = this.state.myRSA.secretKey

            const decryptedMessage = crypto.decrypt(stateEncrypted.data, stateEncrypted.nonce, serverPublicKey, mySecretKey)
            console.log("MY STATE IS " + decryptedMessage)

            this.setState({
                myState: decryptedMessage
            })
            localStorage.setItem('myState', decryptedMessage)
        })
        socket.on('receive-message', content => {
            // alert(content.fromUser + content.senderPublicKey + content.number)
            const user = content.fromUser
            const encryptedObject = content.number
            const theirPublicKey = content.senderPublicKey
            const signature = content.signature
            const encryptedData = encryptedObject.data
            const encryptedNonce = encryptedObject.nonce

            const mySecretKey = this.state.myRSA.secretKey
            console.log("ALL OF IT IS ", encryptedData, encryptedNonce, theirPublicKey, mySecretKey)
            const decryptedMessage = crypto.decrypt(encryptedData, encryptedNonce, theirPublicKey, mySecretKey)
            if (crypto.verify(decryptedMessage, signature, theirPublicKey)){
                alert("Received " + decryptedMessage + " from " + user)
                this.addMessage(decryptedMessage, true)
            }
        })
        socket.on('failed-authentication', () => {
            console.log("Your session is invalid. You may be logged in elsewhere.")
        })
        
        alert("YO")
        this.createRSApair()
    }



    logout(){
        localStorage.clear();
        this.setState({
            to: '',
            contacts: [],
            messages: [],
            myRSA: '',
        })
        window.location.href = "/";
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

        if(result.status === 'ok'){
            this.populateContacts()
            alert('User successfully added')
        }else{
            alert(result.error)
        }
    }

    async populateContacts(){

        const currentUser = localStorage.getItem('user')
        console.log("currentUser is " + currentUser)
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
            console.log(retrievedContacts)
            this.setState({
                contacts: retrievedContacts
            })
            console.log('contacts updated')
        }else{
            alert(result.error)
        }
    }

    async addMessage(content, other){
        // this.setState({
        //     messages: this.state.messages.concat(content)
        // })
        var ul = document.getElementById('message-space')
        var li = document.createElement("li");
        li.appendChild(document.createTextNode(content));
        ul.appendChild(li);
    }


    updateTo(e){
        console.log(e.target)
        const newTo = e.target.innerHTML
        console.log("NEW TO HAS LENGTH "+ newTo.length)
        this.setState({
            to: newTo
        }, () => {
            // this.populateMessages()
        })
        console.log('updated to to '+ newTo)
        
    }

    createRSApair(){
        // const crypto = require('asymmetric-crypto')
        const keyPair = crypto.keyPair()
        console.log(keyPair.secretKey)
        this.setState({
            myRSA: keyPair 
        })
        socket.emit('set-room-and-public-key', localStorage.getItem('user'), keyPair.publicKey)
        alert("SETROOMANDPUBLICKEY")
    }

    async sendMessage(){

        const plainMessage = document.getElementById('messaageContent').value
        const me = localStorage.getItem('user')
        const receiver = this.state.to



        const user = this.state.to
        const JWTtoken = localStorage.getItem('JWTtoken')
        const result = await fetch('http://localhost:3333/api/getpublickey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user
            })
        }).then((res) => res.json())

        if(result.status === "ok"){
            alert("HI")
        }

        const theirPublicKey = result.data

        const mySecretKey = this.state.myRSA.secretKey
        console.log("THEIR PUBLIC IS " )
        console.log(theirPublicKey)
        console.log( " AND MY SECRET IS " + mySecretKey)
        try{
            console.log("ALL ", plainMessage, theirPublicKey, mySecretKey)
            const encryptedObject = crypto.encrypt(plainMessage, theirPublicKey, mySecretKey)
            const signature = crypto.sign(plainMessage, mySecretKey)
            console.log("INSIDE SENDMESSAGE THE ENC OBJECT IS ")
            console.log(encryptedObject)
            const myState = this.state.myState
            socket.emit('send-message', me, receiver, signature, encryptedObject, JWTtoken, myState)
    
        }catch{
            alert("The user you are trying to message isn't active")
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
                        return <div key={i} onClick={this.updateTo}>{username}</div>;
                    }, this)}
                </ul>
                <br></br>
                <h1>Messages between you and {this.state.to}</h1>
                <ul id="message-space">
                    {this.state.messages.map(function(content, i){
                        return <li key={i} onClick={this.updateTo}> {content}</li>;
                    }, this)}
                </ul>
                <input type="text" id="messaageContent"></input>
                <button onClick={this.sendMessage}>Send Message</button>
            </div>
        );
    }
}


export default Dashboard;