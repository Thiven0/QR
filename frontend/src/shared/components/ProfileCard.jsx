import { resolveAssetUrl } from '../../services/apiClient';

const ProfileCard = ({ user, variant = 'default', onImageClick, onQrClick }) => {
  if (!user) return <p className="text-center text-gray-500">No hay datos de usuario.</p>;

  const isExpanded = variant === 'expanded';
  const hasQr = Boolean(user.imagenQR);

  const containerClasses = [
    'mx-auto w-full max-w-full overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg',
    isExpanded && hasQr ? 'max-w-2xl' : 'max-w-md',
  ].join(' ');

  const contentClasses = isExpanded
    ? 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] items-start gap-6 p-4 sm:p-6'
    : 'flex flex-col items-center p-4 sm:p-6';

  const avatarWrapperClasses = [
    'mb-4 shrink-0 overflow-hidden rounded-full border-4 border-green-600 bg-gray-100',
    isExpanded ? 'h-32 w-32 sm:h-36 sm:w-36' : 'h-28 w-28',
  ].join(' ');

  const infoSectionClasses = [
    'w-full min-w-0 space-y-1 text-left text-sm leading-relaxed',
    isExpanded ? 'sm:text-[0.95rem]' : '',
  ].join(' ');

  const qrSectionClasses = [
    'flex min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-green-600/50 bg-green-50/40 px-4 py-5 sm:px-6',
    isExpanded ? 'h-full w-full' : 'mt-6 w-full',
  ].join(' ');

  const avatarAlt = user.nombre ? `Foto de ${user.nombre}` : 'Foto de perfil';

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        <div className="flex min-w-0 flex-col items-center text-center">
          <div className={`${avatarWrapperClasses} ${onImageClick ? 'cursor-zoom-in' : ''}`}>
            <img
              src={resolveAssetUrl(user.imagen) || 'https://ui-avatars.com/api/?name=User'}
              alt={avatarAlt}
              className="h-full w-full object-cover"
              onClick={onImageClick ? () => onImageClick(resolveAssetUrl(user.imagen), avatarAlt) : undefined}
            />
          </div>
          <h2 className="max-w-full break-words text-xl font-bold text-green-700">
            {user.nombre} {user.apellido}
          </h2>
          <p className="mb-2 max-w-full break-words text-gray-600">{user.rolAcademico || user.permisoSistema || 'Sin rol'}</p>
          <div className="my-2 w-full border-t border-gray-200" />
          <div className={infoSectionClasses}>
            <p className="break-words"><span className="font-semibold">Cedula:</span> {user.cedula || 'N/A'}</p>
            <p className="break-words"><span className="font-semibold">RH:</span> {user.RH || user.rh || 'N/A'}</p>
            <p className="break-words"><span className="font-semibold">Facultad:</span> {user.facultad || 'Sin facultad'}</p>
            <p className="break-words"><span className="font-semibold">Telefono:</span> {user.telefono || 'Sin telefono'}</p>
            <p className="break-all"><span className="font-semibold">Correo:</span> {user.email || user.correo || 'Sin correo'}</p>
            <p>
              <span className="font-semibold">Estado:</span>{' '}
              <span className={(user.estado || '').toLowerCase() === 'activo' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {(user.estado || 'Desconocido').toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {hasQr && (
          <div className={`${qrSectionClasses} ${onQrClick ? 'cursor-zoom-in' : ''}`}>
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Mi codigo QR</h3>
            <div className="mt-4 flex h-40 w-full items-center justify-center">
              <img
                src={resolveAssetUrl(user.imagenQR)}
                alt="Codigo QR del usuario"
                className="h-full max-h-40 w-auto max-w-[10rem] object-contain"
                onClick={onQrClick ? () => onQrClick(resolveAssetUrl(user.imagenQR), 'Codigo QR del usuario') : undefined}
              />
            </div>
            <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-green-900/70">
              Presenta este codigo para validar tu identidad en los puntos de control.
            </p>
          </div>
        )}
      </div>
      <div className="bg-green-600 px-3 py-2 text-center text-[0.65rem] font-semibold leading-relaxed tracking-[0.16em] text-white sm:text-xs sm:tracking-widest">
        UNIVERSIDAD UNITROPICO - CARNE DIGITAL
      </div>
    </div>
  );
};

export default ProfileCard;
