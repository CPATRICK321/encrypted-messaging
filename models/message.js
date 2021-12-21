const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema(
    {
        to: { type: String, required: true, unique: true},
        from: { type: String, required: true },
        content: { type: String, required: true }
    },
    {
        collection: 'messages'
    }
)

const model = mongoose.model('MessageSchema', MessageSchema)

module.exports = model