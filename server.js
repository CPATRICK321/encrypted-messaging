const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('./models/user')
const Message = require('./models/message')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const JWT_SECRET = process.env.REACT_APP_JWT_SECRET
let activeUsersPublicKey = new Map()
let activeUsersID = new Map()  
let idToUser = new Map()
let userToState = new Map()

const crypto = require('asymmetric-crypto')
const keyPair = crypto.keyPair()

mongoose.connect(process.env.REACT_APP_MONGODB_CONNECTION, {
    useNewUrlParser: true,  
    useUnifiedTopology: true,
})

var cors = require('cors')
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "https://localhost:3000",
        methods: ["GET", "POST"]
    }
});

app.use(cors())
app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.json())

function verifyJWT(token){
    try{
        const user = jwt.verify(token, JWT_SECRET)
        return true
    }catch{
        return false
    }
}

app.post('/api/login', async (req, res) => {

    const { username, password } = req.body 
    const user = await User.findOne({ username }).lean()

    if (!user){
        //user DNE
        return res.json({ status: 'error', error: 'Invalid username'})
    }

    const correctPassword = await bcrypt.compare(password, user.password)

    if(correctPassword){
        const token = jwt.sign({ 
            username: user.username
        }, JWT_SECRET)
        console.log(username + " has logged in")
        return res.json({ status: 'ok', data: token })
    }else{
        return res.json({ status: 'error', error: 'Invalid username and password'})
    }

})

app.post('/api/register', async (req, res) => {

    const { username, password: plainTextPassword } = req.body

    if(!username || typeof username !== 'string'){
        return res.json({ status: 'error', error: 'Invalid username'})
    }

    if(!plainTextPassword || typeof plainTextPassword !== 'string'){
        return res.json({ status: 'error', error: 'Invalid username'})
    }

    if(plainTextPassword.length < 5){
        return res.json({ status: 'error', error: 'Your password should be at least 5 characters'})
    }

    const password = await bcrypt.hash(plainTextPassword, 10)

    try{
        const response = await User.create({
            username,
            password
        })
    }catch(error){
        if(error.code === 11000){
            return res.json({ status: 'error', error: 'Username is already taken' })
        }
        throw error
    }

    return res.json({status: 'ok'})
})

app.post('/api/addcontact', async (req, res) => {

    const { currentUser, potentialContact } = req.body
    const to = await User.findOne({ username: potentialContact }).lean()

    if(!to){
        return res.json({ statis: 'error', error: 'User does not exist'})
    }else{
        const user = await User.findOne({ username: currentUser })

        if(!user){
            return res.json({ status: 'error', error: 'Huh?'})
        }else{
            user.contacts.push(potentialContact)
            await user.save()
            return res.json({ status: 'ok'})
        }
    }

})

app.post('/api/getcontacts', async (req, res) => {

    const { currentUser } = req.body
    const user = await User.findOne({ username: currentUser }).lean()

    if (!user){
        return res.json({ statis: 'error', error: 'Unknown error'})
    }else{
        const contacts = user.contacts
        return res.json({ status: 'ok', data: contacts})
    }

})

app.post('/api/getmessages', async (req, res) => {

    const { currentUser, toUser } = req.body
    const sieve = {
        $or: [{ from: toUser, to: currentUser }, { from: currentUser, to: toUser }]
    }
    const messageObjects = await Message.find(sieve)
    const messages = []
    for (let i = 0; i < messageObjects.length; i++){
        messages.push(messageObjects[i].content)
    }

    return res.json({status: 'ok', data: messages})

})

app.post('/api/sendmessage', async (req, res) => {

    const { to, from, content } = req.body
    var newMessage = new Message({
        to,
        from,
        content
    })

    newMessage.save()
    return res.json({ status: 'ok'})

})

app.post('/api/getpublickey', async (req, res) => {

    const { user } = req.body
    const userPublicKey = activeUsersPublicKey.get(user)

    if (userPublicKey != null){
        return res.json({ status: 'ok', data: userPublicKey})
    }else{
        return res.json({status: 'error', error: 'User is not active'})
    }

})

io.on('connection', (socket) =>{
    // console.log(username + " has connected")

    function giveNewState(username, pk){
        // console.log(username + " has connected")
        const stateNumber = Math.random().toString()
        userToState.set(username, stateNumber)
        const serverSecretKey = keyPair.secretKey
        const stateEncrypted = crypto.encrypt(stateNumber, pk, serverSecretKey)
        const serverPublicKey = keyPair.publicKey

        io.to(socket.id).emit('set-state', {stateEncrypted, serverPublicKey })
    }

    socket.on('set-id-and-public-key', (username, pk) =>{

        giveNewState(username, pk)
        activeUsersPublicKey.set(username, pk)
        activeUsersID.set(username, socket.id)
        idToUser.set(socket.id, username)
    })
    socket.on('send-message', (fromUser, toUser, signature, number, 
        JWTtoken, clientState) =>{
        if (!(clientState === userToState.get(fromUser))){
            return
        }
        const pk = activeUsersPublicKey.get(fromUser)
        giveNewState(fromUser, pk)

        if(verifyJWT(JWTtoken, JWT_SECRET)){
            const senderPublicKey = activeUsersPublicKey.get(fromUser)
            const receiverID = activeUsersID.get(toUser)
            socket.broadcast.to(receiverID).emit('receive-message', {fromUser, 
                senderPublicKey, signature, number})
        }else{
            io.to(socket.id).emit('failed-authentication')
        }
    })
    socket.on('disconnect', () =>{
        const username = idToUser.get(socket.id)
        activeUsersPublicKey.delete(username)
        activeUsersID.delete(username)
        idToUser.delete(socket.id)
    })
})

server.listen(3333, () => {
    console.log('Server at 3333')
})