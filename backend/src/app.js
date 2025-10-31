const express = require("express");
const cors = require("cors");

const createApp = () => {
  const app = express();

  // Allow only the origins listed in CORS_ALLOWED_ORIGINS (comma-separated) or everyone when set to "*".
  const rawAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS || "*";
  const allowedOrigins = rawAllowedOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowAll = allowedOrigins.includes("*");
      const isAllowed = allowAll || allowedOrigins.includes(origin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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
