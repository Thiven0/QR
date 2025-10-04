const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/ruta-prueba", (req, res) => {
  res.status(200).json({
    id: 1,
    nombre: "Harold",
    web: "web1",
  });
});

module.exports = app;
