//const User = require("../models/adminDash");



//administradores del dashboard

const prueba = (req, res) => {
    return res.status(200).send({
      message: "pruba correctra",
    });
  };

const register = (req, res) => {
    // Recoger datos de la peticion
    let params = req.body;
  
    // Comprobar que me llegan bien y validacion
    if (!params.name || !params.email || !params.password) {
      return res.status(400).json({
        status: "error",
        message: "Faltan datos por enviar",
      });
    }
  
    // Control usuarios duplicados
    User.find({
      $or: [
        { email: params.email.toLowerCase() },
      ],
    })
      .exec()
      .then(async (users) => {
        if (users && users.length >= 1) {
          return res.status(200).send({
            status: "success",
            message: "El usuario ya existe",
          });
        }
  
        // Cifrar la contraseña
        // let pwd = await bcrypt.hash(params.password, 10);
        // params.password = pwd;
        // console.log(pwd);
  
        // Crear objeto de usuario
        let user_to_save = new User(params);
  
        // Guardar usuario en la bd
  
        user_to_save
          .save()
          .then((userStored) => {
            // Devolver resultado
            if (!userStored) {
              return res.status(500).send({
                status: "error",
                message: "Error al guardar el usuario",
              });
            }
            return res.status(200).json({
              status: "success",
              message: "Usuario registrado correctamente",
              user: userStored,
            });
          })
          .catch((error) => {
            return res.status(500).send({
              status: "error",
              message: "Error al guardar el usuario",
              error: error,
            });
          });
  
        // user_to_save.save((error,userStored) => {
  
        //     if (error || !userStored) return res.status(500).send({ status: "error", message: "Error al guardar el ususario" });
  
        //     return res.status(200).json({
        //         status: "success",
        //         message: "Registro exitoso",
        //         user: userStored
        //     });
        // })
      })
      .catch((error) => {
        return res.status(500).json({
          status: "error",
          message: "Error en la consulta de usuarios",
        });
      });
  };

  module.exports = {
    register,
    prueba

  };


