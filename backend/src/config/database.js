const mongoose = require("mongoose");

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("La variable de entorno MONGODB_URI no esta configurada");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("base de datos conectada");
  } catch (error) {
    console.log("el error es: ", error);
    throw new Error("no se pudo conectar a la base de datos");
  }
};

module.exports = connectDatabase;
