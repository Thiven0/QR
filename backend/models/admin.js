const {Schema,model} = require("mongoose")


const AdminSchema = Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    created_at:{
        type: Date,
        default:Date.now
    }
});

module.exports = model("Admin",AdminSchema,"admins")

