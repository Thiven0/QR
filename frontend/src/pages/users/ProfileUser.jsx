import ProfileCard from "../../components/ProfileCard";

// Simulación de usuario (reemplaza esto por tu fetch real)
const usuarioEjemplo = {
  cedula: "123456789",
  rol: "Estudiante",
  nombre: "Juan",
  apellido: "Pérez",
  RH: "O+",
  facultad: "Ingenieria de Sistemas",
  telefono: "3001234567",
  correo: "juan.perez@example.com",
  estado: "Activo",
  imagen: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." // tu base64 real aquí
};

const Profile = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <ProfileCard user={usuarioEjemplo} />
  </div>
);

export default Profile;