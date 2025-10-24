const {Schema,model} = require("mongoose")


const AdminDashSchema = Schema({
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
    cargo:{
        type: String,
        required: false
    },
    created_at:{
        type: Date,
        default:Date.now
    }
});

module.exports = model("AdminDash",AdminDashSchema,"adminsDash")