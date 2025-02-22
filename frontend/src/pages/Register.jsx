import RegisterForm from "../components/RegisterForm";

const Register = () => {
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#d6f4d0] to-[#006F45] overflow-hidden">
      {/* Líneas diagonales decorativas */}
      <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0"></div>
      <div className="absolute top-3/4 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-135 z-0"></div>
      <div className="absolute top-1/6 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>
      <div className="absolute bottom-1/6 right-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>

      {/* Contenedor centrado */}
      <div className="relative flex w-3/4 h-auto bg-white shadow-2xl rounded-lg overflow-hidden z-10 p-10 flex items-center justify-center">
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
