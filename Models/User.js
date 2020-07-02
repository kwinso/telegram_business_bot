const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
    profileId: {
        type: String,
        required: true, 
    }, 
    hasPaid: {
        type: Boolean,
        default: false
    }, 
    qiwiId: String,
    currentQuestion: {
        type: Number,
        default: 0
    }, 
    timesGenerated: {
        type: Number,
        default: 0,
    },
    request: {
        firstName: String,
        lastName: String,
        middleName: String,
        telephone: {
            type: String,
            min: 6
        },
        passport: {
            type: String, 
            min: 10
        },
        yearBirth: {
            type: String,
            max: 4,
        },
        monthBirth: {
            type: String,
            max: 2
        }, 
        dayBirth: {
            type: String, 
            max: 2 
        },
        car: {
            type: String,
            min: 3
        },
        snils: {
            type: String,
            min: 11,
        },
        inn: {
            type: String,
            min: 12,
        }
        
    },
    response: {}
});


module.exports = model("User", UserSchema);