import React from "react";
import QrScanner from "react-qr-scanner";

const Login = () => {
  const handleScan = (data) => {
    if (data) {
      console.log("Código QR escaneado:", data);
    }
  };

  const handleError = (err) => {
    console.error(err);
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#A9D0A2] to-[#006F45] overflow-hidden">
      {/* Contenedor principal */}
      <div className="relative flex w-3/4 h-3/4 bg-white shadow-2xl rounded-lg overflow-hidden z-10">
        {/* Sección izquierda - Escáner QR */}
        <div className="w-1/2 h-full flex justify-center items-center p-10 bg-white">
          <div className="bg-[#FFFFFF] p-8 rounded-xl shadow-2xl w-full text-center border-4 border-dashed border-[#B5A160]">
            <h2 className="text-3xl font-bold text-[#B5A160] mb-6">Escanear Código QR</h2>
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{
                width: "100%",
                borderRadius: "12px",
                border: "4px dashed #B5A160",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
              }}
            />
          </div>
        </div>

        {/* Sección derecha - Logo y título */}
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

      {/* Líneas diagonales decorativas */}
      <div className="absolute top-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute bottom-10 left-1/4 w-2/3 h-px bg-[#A9D0A2] transform rotate-45 z-0"></div>
      <div className="absolute top-1/4 left-1/6 w-2/3 h-px bg-[#A9D0A2] transform rotate-135 z-0"></div>
      <div className="absolute top-3/4 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-135 z-0"></div>
      <div className="absolute top-1/6 left-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>
      <div className="absolute bottom-1/6 right-1/3 w-2/3 h-px bg-[#B5A160] transform rotate-45 z-0"></div>

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
