const { Schema, model } = require("mongoose");

const LastPayemntSchema = new Schema({
    date: {
        type: Date,
        // послдение 10 часов, если время не указано
        default: Date.now() - 1000 * 60 * 60 * 10,
    }
});

module.exports = model("LastPayment", LastPayemntSchema);