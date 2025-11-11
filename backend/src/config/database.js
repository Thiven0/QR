const mongoose = require("mongoose");
const createLogger = require("../utils/logger");

const logger = createLogger("database");

let eventsRegistered = false;

const maskMongoUri = (uri) => {
  if (!uri) {
    return "";
  }

  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//****:****@");
};

const registerConnectionEvents = () => {
  if (eventsRegistered) {
    return;
  }

  const connection = mongoose.connection;

  connection.on("connected", () => {
    logger.info("Conexion con MongoDB establecida", {
      readyState: connection.readyState,
    });
  });

  connection.on("disconnected", () => {
    logger.warn("Conexion con MongoDB perdida", {
      readyState: connection.readyState,
    });
  });

  connection.on("reconnected", () => {
    logger.info("Conexion con MongoDB restablecida", {
      readyState: connection.readyState,
    });
  });

  connection.on("error", (error) => {
    logger.error("Error en la conexion con MongoDB", {
      error: error.message,
      stack: error.stack,
    });
  });

  eventsRegistered = true;
};

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const errorMessage = "La variable de entorno MONGODB_URI no esta configurada";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  registerConnectionEvents();

  logger.info("Iniciando conexion con MongoDB", {
    uri: maskMongoUri(mongoUri),
  });

  try {
    await mongoose.connect(mongoUri);
    logger.info("Base de datos conectada correctamente", {
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    logger.error("No se pudo conectar a la base de datos", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error("no se pudo conectar a la base de datos");
  }
};

module.exports = connectDatabase;
