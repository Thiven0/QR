const jwt = require("jwt-simple");
const moment = require("moment");


const libjwt = require("../services/jwt");
const secret = libjwt.secret;


//autentificacion
exports.auth = (req,res,next) =>{
    //comprobar header
    if(!req.headers.authorization){
        return res.status(403).send({
            status:"error",
            messege: "no tiene cabecera de autentificacion"
        });
    }

    let token = req.headers.authorization.replace(/['"]+/g,'');

    //decodificacion del token 

    try{
        let payload = jwt.decode(token,secret);

        //expiracion token
        if(payload.exp <= moment().unix()){
            return res.status(401).send({
                status: "error",
                messege: "token expirado"

            })
        }
        req.user = payload;

    }catch(error){
        return res.status(404).send({
            status:"error",
            messege:"token invalido",
            error
        })
    }
    

    next()

}
