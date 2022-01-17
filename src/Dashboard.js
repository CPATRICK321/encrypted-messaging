import React, { Component } from 'react';
// import { io } from 'socket.io-client'
import {socket} from "./service/socket"
import './Dashboard.scss'

// Much of the html is from https://codepen.io/TurkAysenur/pen/ZEbXoRZ

// socket.connect()

//


// import { io } from 'socket.io-client'

// const socket = io(`http://${window.location.hostname}:3333`)


const crypto = require('asymmetric-crypto')


class Dashboard extends Component {

    constructor(props){
        super(props);

        this.state = {
            to: '',
            indexOfToUser: -2,
            contacts: [],
            messageStorage: [],
            myRSA: {},
            myState: 0,
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
        socket.on('set-state', content => {

            const stateEncrypted = content.stateEncrypted
            const serverPublicKey = content.serverPublicKey
            const mySecretKey = this.state.myRSA.secretKey
            const decryptedMessage = crypto.decrypt(stateEncrypted.data, stateEncrypted.nonce, serverPublicKey, mySecretKey)

            this.setState({
                myState: decryptedMessage
            })
            localStorage.setItem('myState', decryptedMessage)
        })
        socket.on('receive-message', content => {
            
            const user = content.fromUser
            const encryptedObject = content.number
            const theirPublicKey = content.senderPublicKey
            const signature = content.signature
            const encryptedData = encryptedObject.data
            const encryptedNonce = encryptedObject.nonce
            const mySecretKey = this.state.myRSA.secretKey
            const decryptedMessage = crypto.decrypt(encryptedData, encryptedNonce, 
                theirPublicKey, mySecretKey)

            if (crypto.verify(decryptedMessage, signature, theirPublicKey)){
                console.log("RECEIVING MESSAGE FROM " + user + " AND IT SAYS " + decryptedMessage)
                this.addMessage(user, decryptedMessage, true)
            }
        })
        socket.on('failed-authentication', () => {

            console.log("Your session is invalid. You may be logged in elsewhere.")
        })
        
        this.createRSApair()
    }



    logout(){

        localStorage.clear();
        this.setState({
            to: '',
            indexOfToUser: 0,
            contacts: [],
            messageStorage: [],
            myRSA: '',
        })
        window.location.href = "/";
    }

    async addContact(){

        const currentUser = localStorage.getItem('user')
        const contactElement = document.getElementById('contactSearch')
        const potentialContact = contactElement.value
        contactElement.value = ""

        if (this.state.contacts.includes(potentialContact)){
            alert(potentialContact + " is already in your contacts silly goose")
            return
        }

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
            for(let i = 0; i < retrievedContacts.length; i++){
                var updatedMessages = this.state.messageStorage.concat({name: retrievedContacts[i], messages: []})
                this.setState({ messageStorage: updatedMessages })
            }
            console.log('contacts updated')
        }else{
            alert(result.error)
        }
    }

    async addMessage(user, content, other){

        var findIndexOfUser = this.state.messageStorage.findIndex(function (username){
            return username.name === user
        })
        const currentMessageStorage = this.state.messageStorage
        const updatedMessageArray = this.state.messageStorage[findIndexOfUser].messages.concat({content: content, other: other})
        currentMessageStorage[findIndexOfUser].messages = updatedMessageArray
        console.log(currentMessageStorage)
        console.log("IS THE NEW MESSAGE STORAGE")
        this.setState({
            messageStorage: currentMessageStorage
        })
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
        var findIndexOfUser = this.state.messageStorage.findIndex(function (username){
            return username.name === newTo
        })
        // this.state.messageStorage.findIndex(function (username){
        //     alert("index of user is "+ findIndexOfUser)
        //     const newIndex = username.name === "mmmmm"
        // })
        console.log(this.state.contacts)
        this.setState({
            indexOfToUser: findIndexOfUser
        })
        console.log("INDEXOFTOUSER IS " + this.state.indexOfToUser)
    }

    createRSApair(){

        const keyPair = crypto.keyPair()
        this.setState({
            myRSA: keyPair 
        })
        socket.emit('set-id-and-public-key', localStorage.getItem('user'), 
            keyPair.publicKey)
    }

    async sendMessage(){

        const messageElement = document.getElementById('messageContent')
        const plainMessage = messageElement.value
        messageElement.value = ""
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

        if(!(result.status === "ok")){
            return
        }

        const theirPublicKey = result.data
        const mySecretKey = this.state.myRSA.secretKey

        try{
            const encryptedObject = crypto.encrypt(plainMessage, 
                theirPublicKey, mySecretKey)
            const signature = crypto.sign(plainMessage, mySecretKey)
            const myState = this.state.myState
            socket.emit('send-message', me, receiver, signature, encryptedObject, 
                JWTtoken, myState)
            this.addMessage(receiver, plainMessage, false)
        }catch{
            alert("The user you are trying to message isn't active")
        }

    }

    render() {
        // return (
        //     <div>
        //         <button onClick={this.logout}>
        //             Logout
        //         </button>
        //         <br></br>
        //         YO welcome to the dashboard 
        //         {" " + localStorage.getItem('user')}
        //         <br></br>
        //         <input type="text" id="contactSearch"></input>
        //         <button onClick={this.addContact}>Add Contact</button>
        //         <br></br>
        //         <h1>Contact List</h1>
        //         <ul>
        //             {this.state.contacts.map(function(username, i){
        //                 return <div key={i} onClick={this.updateTo}>{username}</div>;
        //             }, this)}
        //         </ul>
        //         <br></br>
        //         <h1>Messages between you and {this.state.to}</h1>
        //         <ul id="message-space">
        //             {this.state.messages.map(function(content, i){
        //                 return <li key={i} onClick={this.updateTo}> {content}</li>;
        //             }, this)}
        //         </ul>
        //         <input type="text" id="messaageContent"></input>
        //         <button onClick={this.sendMessage}>Send Message</button>
        //     </div>
        // );



        return(
            <div className="app">
 <div className="header">
  <div className="logo">
   <svg viewBox="0 0 513 513" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M256.025.05C117.67-2.678 3.184 107.038.025 245.383a240.703 240.703 0 0085.333 182.613v73.387c0 5.891 4.776 10.667 10.667 10.667a10.67 10.67 0 005.653-1.621l59.456-37.141a264.142 264.142 0 0094.891 17.429c138.355 2.728 252.841-106.988 256-245.333C508.866 107.038 394.38-2.678 256.025.05z" />
    <path d="M330.518 131.099l-213.825 130.08c-7.387 4.494-5.74 15.711 2.656 17.97l72.009 19.374a9.88 9.88 0 007.703-1.094l32.882-20.003-10.113 37.136a9.88 9.88 0 001.083 7.704l38.561 63.826c4.488 7.427 15.726 5.936 18.003-2.425l65.764-241.49c2.337-8.582-7.092-15.72-14.723-11.078zM266.44 356.177l-24.415-40.411 15.544-57.074c2.336-8.581-7.093-15.719-14.723-11.078l-50.536 30.744-45.592-12.266L319.616 160.91 266.44 356.177z" fill="#fff" /></svg>
  </div>
  <div className="search-bar">
   <input type="text" id="contactSearch" placeholder="Search users..." />
  </div>
  <button onClick={this.addContact}>Add Contact</button>
  <div className="user-settings">
   <div className="dark-light">
    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
     <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
   </div>
   <div className="settings">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
     <circle cx="12" cy="12" r="3" />
     <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
   </div>
   <img className="user-profile" src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" alt="" />
  </div>
 </div>
 <div className="wrapper">
  <div className="conversation-area">


    {this.state.contacts.map(function(username, i){
        return(
        <div className="msg online" key={i}>
            <img className="msg-profile" src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" alt="" />
            <div className="msg-detail">
            <div className="msg-username" onClick={this.updateTo}>{username}</div>
            <div className="msg-content">
                <span className="msg-message">What time was our meet</span>
                <span className="msg-date">20m</span>
            </div>
            </div>
        </div>
        )
    }, this)}
   

   <button className="add"></button>
   <div className="overlay"></div>
  </div>
  <div className="chat-area">
   <div className="chat-area-header">
    <div className="chat-area-title">{this.state.to !== "" ? "Messages with " + this.state.to : "Click a contact"}</div>
    <div className="chat-area-group">
     <img className="chat-area-profile" src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/3364143/download+%283%29+%281%29.png" alt="" />
     <img className="chat-area-profile" src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/3364143/download+%282%29.png" alt="" />
     <img className="chat-area-profile" src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/3364143/download+%2812%29.png" alt="" />
     <span>+4</span>
    </div>
   </div>
   <div className="chat-area-main">


       {/* WHERE MESSAGES GO!! */}
       {/* {this.state.to} */}
       {
       this.state.indexOfToUser === -2 ? "" :
       this.state.messageStorage[this.state.indexOfToUser].messages.map(function(object, i){
        return(
        <div className={object.other ? "chat-msg" : "chat-msg owner"} key={i}>
            <div className="chat-msg-profile">
            </div>
            <div className="chat-msg-content">
            <div className="chat-msg-text">{object.content}</div>
            </div>
       </div>
        )
    }, this)
    }
    {/* <div className="chat-msg owner">
     <div className="chat-msg-profile">
      <img className="chat-msg-img" src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/3364143/download+%281%29.png" alt="" />
      <div className="chat-msg-date">Message seen 2.50pm</div>
     </div>
     <div className="chat-msg-content">
      <div className="chat-msg-text">Tincidunt arcu non sodales😂</div>
     </div>
    </div>
    <div className="chat-msg">
     <div className="chat-msg-profile">
      <img className="chat-msg-img" src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/3364143/download+%282%29.png" alt="" />
      <div className="chat-msg-date">Message seen 3.16pm</div>
     </div>
     <div className="chat-msg-content">
      <div className="chat-msg-text">Consectetur adipiscing elit pellentesque habitant morbi tristique senectus et🥰</div>
     </div>
    </div> */}

    {/* WHERE MESSAGES END */}
   </div>
   <div className="chat-area-footer">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-video">
     <path d="M23 7l-7 5 7 5V7z" />
     <rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-image">
     <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
     <circle cx="8.5" cy="8.5" r="1.5" />
     <path d="M21 15l-5-5L5 21" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-plus-circle">
     <circle cx="12" cy="12" r="10" />
     <path d="M12 8v8M8 12h8" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-paperclip">
     <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
    <input type="text" id="messageContent" placeholder="Type something here..." />
    <button onClick={this.sendMessage}>Send</button>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-smile">
     <circle cx="12" cy="12" r="10" />
     <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-up">
     <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
   </div>
  </div>
 </div>
</div>
        )
    }
}


export default Dashboard;