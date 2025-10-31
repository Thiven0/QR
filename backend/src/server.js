const connectDatabase = require("./config/database");
const createApp = require("./app");
const createLogger = require("./utils/logger");

const logger = createLogger("server");
const PORT = Number(process.env.PORT) || 3000;
const ENVIRONMENT = process.env.NODE_ENV || "development";

const startServer = async () => {
  logger.info("Iniciando servidor HTTP", {
    port: PORT,
    environment: ENVIRONMENT,
  });

  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(PORT, () => {
      logger.info("Servidor de Node corriendo", {
        port: PORT,
        environment: ENVIRONMENT,
      });
    });

    server.on("error", (error) => {
      logger.error("Error en la capa HTTP del servidor", {
        error: error.message,
      });
    });
  } catch (error) {
    logger.error("No se pudo iniciar el servidor", {
      error: error.message,
    });
    process.exit(1);
  }
};

startServer();
