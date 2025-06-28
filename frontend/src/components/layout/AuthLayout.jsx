const AuthLayout = ({ children }) => {
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#d6f4d0] to-[#006F45] overflow-hidden">
        {/* Líneas decorativas */}
        <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
        <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
        <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0"></div>
  
        <div className="relative flex w-3/4 h-3/4 bg-white shadow-2xl rounded-lg overflow-hidden z-10">
          {children}
        </div>
      </div>
    );
  };
  
  export default AuthLayout;
