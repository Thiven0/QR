const AuthLayout = ({ children }) => {
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#d6f4d0] to-[#006F45] overflow-hidden">
      {/* Líneas decorativas diagonales */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#ffffff33] to-[#00000033] pointer-events-none"></div>
      <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0 opacity-50"></div>
      <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0 opacity-50"></div>
      <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0 opacity-50"></div>
      <div className="absolute top-3/4 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-135 z-0 opacity-50"></div>
      <div className="absolute top-1/6 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0 opacity-50"></div>
      <div className="absolute bottom-1/6 right-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0 opacity-50"></div>

      {/* Contenedor centrado */}
      <div className="relative flex flex-col w-11/12 max-w-lg bg-white shadow-2xl rounded-lg overflow-hidden z-10 p-8">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;