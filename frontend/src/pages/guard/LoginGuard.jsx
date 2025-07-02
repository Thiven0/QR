import LoginForm from "../../components/LoginFormGuard";
import AuthLayout from "../../components/layout/AuthLayout";
//rt Style from "../components/styles/authStyless.css";

const Login = () => {
  return (
    <AuthLayout>
      {/* Sección Izquierda - Formulario */}
      <div className="w-1/2 h-full bg-white flex justify-center items-center p-10">
        <LoginForm />
      </div>

      {/* Sección Derecha - Diseño Visual */}
      <div className="relative w-1/2 h-full flex justify-center items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#B5A160] clip-path-oval scale-[1.02]" />
        <div className="absolute inset-0 bg-[#00594E] clip-path-oval z-20 flex justify-center items-center">
          <div className="text-center text-white z-20">
            <h1 className="text-5xl font-bold">Unitrópico</h1>
            <p className="text-xl">Universidad Internacional del Trópico Americano</p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;