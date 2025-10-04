const connectDatabase = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log("Servidor de Node corriendo en el puerto:", PORT);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor", error);
    process.exit(1);
  }
};

startServer();
