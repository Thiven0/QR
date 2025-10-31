const express = require("express");
const cors = require("cors");

const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api/users", require("./routes/user.routes"));
  app.use("/api/exitEntry", require("./routes/entry-exit.routes"));
  app.use("/api/visitors", require("./routes/visitor.routes"));
  app.use("/api/vehicles", require("./routes/vehicle.routes"));

  app.get("/ruta-prueba", (req, res) => {
    res.status(200).json({
      id: 1,
      nombre: "Harold",
      web: "web1",
    });
  });

  return app;
};

module.exports = createApp;
