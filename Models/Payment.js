const { Schema, model } = require("mongoose");

const PaymentSchema = new Schema({
    started: {
        type: Date,
        default: Date.now()
    },
    comment: String,
    payerId: String,
});


module.exports = model("Payment", PaymentSchema);