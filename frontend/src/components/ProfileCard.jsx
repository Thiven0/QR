const ProfileCard = ({ user }) => {
  if (!user) return <p className="text-center text-gray-500">No hay datos de usuario.</p>;

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 mt-10">
      <div className="flex flex-col items-center p-6">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-green-600 mb-4 bg-gray-100">
          <img
            src={user.imagen || "https://ui-avatars.com/api/?name=User"}
            alt="Foto de perfil"
            className="object-cover w-full h-full"
          />
        </div>
        <h2 className="text-xl font-bold text-green-700 mb-1">{user.nombre} {user.apellido}</h2>
        <p className="text-gray-600 mb-2">{user.rol}</p>
        <div className="w-full border-t border-gray-200 my-2"></div>
        <div className="w-full text-left text-sm space-y-1">
          <p><span className="font-semibold">Cédula:</span> {user.cedula}</p>
          <p><span className="font-semibold">RH:</span> {user.RH || user.rh}</p>
          <p><span className="font-semibold">Facultad:</span> {user.facultad}</p>
          <p><span className="font-semibold">Teléfono:</span> {user.telefono}</p>
          <p><span className="font-semibold">Correo:</span> {user.correo}</p>
          <p><span className="font-semibold">Estado:</span> 
            <span className={user.estado === "Activo" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {user.estado}
            </span>
          </p>
        </div>
      </div>
      <div className="bg-green-600 text-white text-center py-2 text-xs font-semibold tracking-widest">
        UNIVERSIDAD UNITROPICO - CARNÉ DIGITAL
      </div>
    </div>
  );
};

export default ProfileCard;