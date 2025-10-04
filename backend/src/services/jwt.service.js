const jwt = require("jwt-simple");
const moment = require("moment");

const SECRET = "CLAVE_SECRETA_universidad_unitropico_si";
const TOKEN_EXPIRATION_DAYS = 30;

const createToken = (user) => {
  const payload = {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    permisoSistema: user.permisoSistema,
    iat: moment().unix(),
    exp: moment().add(TOKEN_EXPIRATION_DAYS, "days").unix(),
  };

  return jwt.encode(payload, SECRET);
};

const decodeToken = (token) => jwt.decode(token, SECRET);

module.exports = {
  createToken,
  decodeToken,
  SECRET,
};
