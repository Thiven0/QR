
import LoginForm from "./LoginForm";

const Login = () => {
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#ffffff] to-[rgb(135,166,154)] overflow-hidden">

      {/* Líneas diagonales decorativas */}
      <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0"></div>
      <div className="absolute top-3/4 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-135 z-0"></div>
      <div className="absolute top-1/6 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>
      <div className="absolute bottom-1/6 right-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>

      {/* Contenedor principal del login */}
      <div className="relative flex w-3/4 h-3/4 bg-white shadow-2xl rounded-lg overflow-hidden z-10">
        {/* Sección izquierda - Formulario */}
        <div className="w-1/2 h-full bg-white flex justify-center items-center p-10">
          <LoginForm />
        </div>

        <div className="relative w-1/2 h-full flex justify-center items-center overflow-hidden">
          {/* Elipse dorada (borde) */}
          <div className="absolute inset-0 bg-[#B5A160] clip-path-oval scale-[1.02]" />

          {/* Elipse verde oscuro encima */}
          <div className="absolute inset-0 bg-[#00594E] clip-path-oval z-20 flex justify-center items-center">
            <div className="text-center text-white z-20">
              <h1 className="text-5xl font-bold">Unitrópico</h1>
              <p className="text-xl">Universidad Internacional del Trópico Americano</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .clip-path-oval {
          clip-path: ellipse(80% 90% at 85% 50%);
          border-top-left-radius: 100px;
          border-bottom-left-radius: 100px;
        }
      `}</style>
    </div>
  );
};

export default Login;