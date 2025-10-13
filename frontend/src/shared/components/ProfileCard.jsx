const ProfileCard = ({ user, variant = 'default' }) => {
  if (!user) return <p className="text-center text-gray-500">No hay datos de usuario.</p>;

  const isExpanded = variant === 'expanded';

  const containerClasses = [
    'mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 mt-10',
    isExpanded ? 'max-w-4xl w-full' : 'max-w-sm',
  ].join(' ');

  const contentClasses = isExpanded
    ? 'flex flex-col items-center md:flex-row md:items-start md:gap-10 p-8'
    : 'flex flex-col items-center p-6';

  const avatarWrapperClasses = [
    'rounded-full overflow-hidden border-4 border-green-600 mb-4 bg-gray-100',
    isExpanded ? 'w-36 h-36 md:w-40 md:h-40' : 'w-28 h-28',
  ].join(' ');

  const infoSectionClasses = [
    'w-full text-left text-sm space-y-1',
    isExpanded ? 'md:flex-1' : '',
  ].join(' ');

  const qrSectionClasses = [
    'flex flex-col items-center justify-center rounded-lg border border-dashed border-green-600/50 bg-green-50/40 px-6 py-5',
    isExpanded ? 'mt-6 md:mt-0 md:w-64' : 'mt-6 w-full',
  ].join(' ');

  const avatarAlt = user.nombre ? `Foto de ${user.nombre}` : 'Foto de perfil';

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className={avatarWrapperClasses}>
            <img
              src={user.imagen || 'https://ui-avatars.com/api/?name=User'}
              alt={avatarAlt}
              className="object-cover w-full h-full"
            />
          </div>
          <h2 className="text-xl font-bold text-green-700 mb-1">
            {user.nombre} {user.apellido}
          </h2>
          <p className="text-gray-600 mb-2">{user.rolAcademico || user.permisoSistema || 'Sin rol'}</p>
          <div className="w-full border-t border-gray-200 my-2" />
          <div className={infoSectionClasses}>
            <p><span className="font-semibold">Cedula:</span> {user.cedula || 'N/A'}</p>
            <p><span className="font-semibold">RH:</span> {user.RH || user.rh || 'N/A'}</p>
            <p><span className="font-semibold">Facultad:</span> {user.facultad || 'Sin facultad'}</p>
            <p><span className="font-semibold">Telefono:</span> {user.telefono || 'Sin telefono'}</p>
            <p><span className="font-semibold">Correo:</span> {user.email || user.correo || 'Sin correo'}</p>
            <p>
              <span className="font-semibold">Estado:</span>{' '}
              <span className={(user.estado || '').toLowerCase() === 'activo' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {(user.estado || 'Desconocido').toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {user.imagenQR && (
          <div className={qrSectionClasses}>
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Mi codigo QR</h3>
            <img
              src={user.imagenQR}
              alt="Codigo QR del usuario"
              className="mt-4 w-36 h-36 object-contain"
            />
            <p className="mt-3 text-xs text-green-900/70 text-center">
              Presenta este codigo para validar tu identidad en los puntos de control.
            </p>
          </div>
        )}
      </div>
      <div className="bg-green-600 text-white text-center py-2 text-xs font-semibold tracking-widest">
        UNIVERSIDAD UNITROPICO - CARNE DIGITAL
      </div>
    </div>
  );
};

export default ProfileCard;
