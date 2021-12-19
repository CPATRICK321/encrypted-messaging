const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('./models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = 'jkj'



mongoose.connect('mongodb+srv://cpatrick67135:pass123word@encrypted-messaging-app.46hse.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
    useNewUrlParser: true,  
    useUnifiedTopology: true,
})


var cors = require('cors')
const app = express()

app.use(cors())
app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.json())

function veryifyJWT(token){
    const user = jwt.verify(token, JWT_SECRET)
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
            id: user._id, 
            username: user.username 
        }, JWT_SECRET)

        return res.json({ status: 'ok', data: token})
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

app.listen(3333, () => {
    console.log('Server at 3333')
})


