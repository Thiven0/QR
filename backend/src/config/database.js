const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    await mongoose.connect("mongodb+srv://admin1:admin1@cluster0.xxyp4j3.mongodb.net/universidad?retryWrites=true&w=majority&appName=Cluster0");
    console.log("base de datos conectada");
  } catch (error) {
    console.log("el error es: ", error);
    throw new Error("no se pudo conectar a la base de datos");
  }
};

module.exports = connectDatabase;
