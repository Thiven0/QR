// const User = require("../models/admin");
// const User2 =require("../models/user")
// const bcrypt = require("bcrypt");
// const jwt = require("../services/jwt")


//selador

const prueba = (req, res) => {
  return res.status(200).send({
    message: "pruba correctra",
  });
};

const register = (req, res) => {
  let params = req.body;

  if (!params.name || !params.email || !params.password) {
    return res.status(400).json({
      status: "error",
      message: "Faltan Datos",
    });
  }

  //encontrar duplicados
  User.find({
    $or: [{ email: params.email.toLowerCase() }],
  })
    .exec()
    .then(async (user) => {
      if (user && user.length >= 1) {
        return res.status(200).send({
          status: "success",
          message: "El usuario ya existe",
        });
      }
      //cifrado
      let pwd = await bcrypt.hash(params.password, 10);
      params.password = pwd;
      console.log(pwd);

      // Crear objeto de usuario
      let user_to_save = new User(params);

      // Guardar admin en la bd

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
    }).catch((error) => {
      return res.status(500).json({
        status: "error",
        message: "Error en la consulta de usuarios",
      });
    });

  
};


const login = (req, res) => {
  //parametros
  let params = req.body;

  if (!params.email || !params.password) {
    return res.status(400).send({
      status: "error",
      message: "Faltan datos por enviar",
    });
  }

  //existencia en la db
  User.findOne({ email: params.email })
    //.select({"password": 0})
    //.exec()
    .then((user) => {
      console.log(params.email," ",params.password);

      if (!user) {
        return res
          .status(404)
          .send({ status: "error", message: "el usuario no existe " });
      }

      //comprbar pw
      
      const pwd = bcrypt.compareSync(params.password, user.password);

      if (!pwd) {
        return res
          .status(400)
          .send({ status: "error", message: "error en la contraseña" });
      }

      //devolver token
      const token = jwt.create_tocken(user);

      //datos del usuario

      return res.status(200).send({
        status: "success",
        message: "identificado correctamente",
        user: { id: user.id, name: user.name,email: user.email},
        token,
      });
    })
    .catch((err) => {
      return res
        .status(404)
        .send({ status: "error", message: "el usuario no existe" });
    });
};

const qr = (req, res)=>{
  let params = req.body;
  console.log("el dato es ",params);

  User2.findOne({ cedula: params.cedula })
  
  .then((user) => {
    
    if (!user) {
      return res
        .status(404)
        .send({ status: "error", message: "el usuario no existe " });
        
    }

    if(user.estado === "activo"){
      user.estado = "inactivo";
    }else{
      user.estado = "activo"
    };

      // Guardar los cambios en la base de datos
      return user.save()
        .then((updatedUser) => {
          return res.status(200).send({
            status: "success",
            message: "Usuario identificado y actualizado correctamente",
            user: {
              id: updatedUser.id,
              estado: updatedUser.estado,
              user
            }, // Solo se devuelven el ID y el estado
          });
        });
    


    //datos del usuario

    return res.status(200).send({
      status: "success",
      message: "identificado correctamente",
      user: { user
        //id: user.id, nombre: user.nombre,cedula: user.cedula, estado: user.estado
      },
      //token,
    });
  })
  .catch((err) => {
    return res
      .status(404)
      .send({ status: "error", message: "el usuario no existe",err });
  });
 };


// const qr = (req, res) => {
//   let params = req.body;
//   console.log("el dato es ", params);

//   User2.findOne({ cedula: params.cedula })
//     .then((user) => {
//       if (!user) {
//         return res
//           .status(404)
//           .send({ status: "error", message: "el usuario no existe " });
//       }

//       // Actualizar el campo "estado" a "inactivo"
//       user.estado = "inactivo";

//       // Guardar los cambios en la base de datos
//       return user.save()
//         .then((updatedUser) => {
//           return res.status(200).send({
//             status: "success",
//             message: "Usuario identificado y actualizado correctamente",
//             user: {
//               id: updatedUser.id,
//               estado: updatedUser.estado
//             }, // Solo se devuelven el ID y el estado
//           });
//         });
//     })
//     .catch((err) => {
//       return res
//         .status(404)
//         .send({ status: "error", message: "El usuario no existe", err });
//     });
// };

  
  
  


module.exports = { prueba, register,login,qr };
