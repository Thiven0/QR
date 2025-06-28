const {Schema,model} = require("mongoose")


const GuardSchema = Schema({
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

module.exports = model("Guard",GuardSchema,"Guards"); // Guard es el nombre de la colección en la base de datos

