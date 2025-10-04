const conection = require("./db/conection")
const express = require("express")
const cors = require("cors")

console.log("API node iniciada");

// Conexión a la base de datos
console.log("conectando...");
conection();
// Crear servidor Express
const app = express();
const puerto = 3000;

// Conf de CORS

app.use(cors());

/*
app.use(cors({origin: ['http://localhost:5173', 'http://localhost:1234'],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type']
}));*/

// Middleware para parsear el cuerpo de las peticiones HTTP
app.use(express.json({ limit: "10mb" })); // Aumenta el límite a 10 megas
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rutas
const adminRoutes = require("./routes/Admin");
//const adminDashRoutes = require("./routes/AdminDash")
const registerRoutes = require("./routes/registerRoutes"); 
//const userRoutes = require("./routes/User");


// Usar rutas
app.use("/api/Admin", adminRoutes);
//app.use("/api/dash", adminDashRoutes);

app.use("/api/Register", registerRoutes);
//app.use("/api/user",userRoutes);


// Ruta de prueba
app.get("/ruta-prueba", (req, res) => {
  return res.status(200).json({
    id: 1,
    nombre: "Harold",
    web: "web1",
  });
});

// Iniciar servidor para escuchar peticiones HTTP
app.listen(puerto, () => {
    console.log("Servidor de Node corriendo en el puerto:", puerto);
});