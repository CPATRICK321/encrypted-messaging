const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('./models/user')
const Message = require('./models/message')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = 'jkj'
let activeUsersPublicKey = new Map()
let activeUsersID = new Map()  
let idToUser = new Map()
let userToState = new Map()

const crypto = require('asymmetric-crypto')
const keyPair = crypto.keyPair()
console.log("MY SECRET KEY IS " + keyPair.secretKey)


mongoose.connect('mongodb+srv://cpatrick67135:pass123word@encrypted-messaging-app.46hse.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
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
        origin: "http://localhost:3000",
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
    }else{
        console.log("ThIS IS MY USER" + user)
    }

    const tof = await bcrypt.compare(password, user.password)

    if(tof){
        //successful
        const token = jwt.sign({ 
            username: user.username
        }, JWT_SECRET)

        return res.json({ status: 'ok', data: token })
    }else{
        //unsuccessful
        return res.json({ status: 'error', error: 'Invalid username and password'})
    }

    // return res.json({ status: 'ok', data: 'token:)'})
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
        console.log('User created successfully: ', response)
    }catch(error){
        if(error.code === 11000){
            console.log("TAKEN")
            return res.json({ status: 'error', error: 'Username is already taken' })
        }
        throw error

    }

    console.log(await bcrypt.hash(password, 10))

    return res.json({status: 'ok'})
})

app.post('/api/addcontact', async (req, res) => {
    const { currentUser, potentialContact } = req.body

    console.log('touser is ' + currentUser)

    const to = await User.findOne({ username: potentialContact }).lean()

    if(!to){
        return res.json({ statis: 'error', error: 'User does not exist'})
    }else{
        console.log("FOUND " + to.username)
        const user = await User.findOne({ username: currentUser })

        if(!user){
            return res.json({ status: 'error', error: 'Huh?'})
        }else{
            console.log("adding " + potentialContact)
            user.contacts.push(potentialContact)
            await user.save()
            return res.json({ status: 'ok'})
        }
    }

})

app.post('/api/getcontacts', async (req, res) => {
    const { currentUser } = req.body
    console.log("fromuser is " + currentUser)
    const user = await User.findOne({ username: currentUser }).lean()

    if (!user){
        return res.json({ statis: 'error', error: 'Unknown error'})
    }else{
        const contacts = user.contacts
        // console.log("my contacts are " + contacts)
        return res.json({ status: 'ok', data: contacts})
    }

})

app.post('/api/getmessages', async (req, res) => {
    const { currentUser, toUser } = req.body
    console.log("message from " + currentUser + " going to " + toUser + toUser.length)

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

    function giveNewState(username, pk){
        const stateNumber = Math.random().toString()
        console.log(stateNumber)
        userToState.set(username, stateNumber)
        console.log("IS THIS WORKING")

        const serverSecretKey = keyPair.secretKey
        const stateEncrypted = crypto.encrypt(stateNumber, pk, serverSecretKey)
        const serverPublicKey = keyPair.publicKey

        io.to(socket.id).emit('set-state', {stateEncrypted, serverPublicKey })
    }

    socket.on('set-room-and-public-key', (username, pk) =>{

        //set the state number and send it back
        giveNewState(username, pk)

        console.log("THE SOCKET ID IS " + socket.id)
        //

        console.log("MY USeRNAME IS " + username + "AND MY PUBLIC KEY IS " + pk)
        activeUsersPublicKey.set(username, pk)
        activeUsersID.set(username, socket.id)
        console.log("Connected " + username + " with id: " + socket.id)
        idToUser.set(socket.id, username)
    })
    socket.on('send-message', (fromUser, toUser, signature, number, JWTtoken, clientState) =>{
        if (!(clientState === userToState.get(fromUser))){
            console.log("BAD STATE!!!!!!!")
            return
        }
        console.log("GOOOOOOOOOOD STATE :)")
        const pk = activeUsersPublicKey.get(fromUser)
        giveNewState(fromUser, pk)

        if(verifyJWT(JWTtoken, JWT_SECRET)){
            const senderPublicKey = activeUsersPublicKey.get(fromUser)
            const receiverID = activeUsersID.get(toUser)
            console.log('send ' + number + " to room " + receiverID + " which is user " + toUser)
            console.log(number)
            socket.broadcast.to(receiverID).emit('receive-message', {fromUser, senderPublicKey, signature, number})
        }else{
            socket.broadcast.to(socket.id).emit('failed-authentication')
        }

    })
    socket.on('disconnect', () =>{
        const username = idToUser.get(socket.id)
        // console.log("MTVEEEE " + idToUser.get(socket.id))
        activeUsersPublicKey.delete(username)
        activeUsersID.delete(username)
        idToUser.delete(socket.id)
    })
})



server.listen(3333, () => {
    console.log('Server at 3333')
})