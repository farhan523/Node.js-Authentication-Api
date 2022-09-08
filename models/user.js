const { Schema, model } = require('mongoose');
const mongoose = require('mongoose')


const userSchema = new Schema({
    name:{
        type:String,
        required: true
    },
    email:{
        type:String,
        required: true
    },
    password:{
        type:String,
        required:true
    },
    imageUrl:{
        type:String,
        required:true
    },
    isVerified:{
        type:Boolean,
        required:true
    },
    resetToken:String,
    resetTokenExpiration:Date,
})

module.exports = mongoose.model('User', userSchema)