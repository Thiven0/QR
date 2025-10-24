const jwt = require("jwt-simple");
const moment = require("moment");


//clave secreta

const secret = "CLAVE_SECRETA_universidad_unitropico_si";

//crar token

const create_tocken = (user) =>{
    const payload = {
        id: user._id,
        name: user.name,
        email: user.email,
        iat: moment().unix(),
        exp: moment().add(30,"days").unix()
    };

    //devolver jwt
    return jwt.encode(payload,secret);
}


module.exports = {
    create_tocken,
    secret
}