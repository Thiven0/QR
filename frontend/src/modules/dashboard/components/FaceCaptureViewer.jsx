import { useEffect, useState } from 'react';
import { FiImage } from 'react-icons/fi';
import { apiBlobRequest } from '../../../services/apiClient';
import useAuth from '../../auth/hooks/useAuth';
import ModalDialog from '../../../shared/components/ModalDialog';

const getLogId = (capture) => capture?.logId || capture?.id || capture?._id;

const FaceCaptureViewer = ({ isOpen, captures = [], onClose, title = 'Capturas del registro' }) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isOpen || !token) return undefined;

    const controller = new AbortController();
    const objectUrls = [];
    setItems(captures.map((capture) => ({ ...capture, loading: true, url: '', error: '' })));

    Promise.all(
      captures.map(async (capture) => {
        const logId = getLogId(capture);
        if (!logId) return { ...capture, loading: false, url: '', error: 'Captura no disponible.' };
        try {
          const blob = await apiBlobRequest(`/face/logs/${logId}/capture`, { token, signal: controller.signal });
          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          return { ...capture, loading: false, url, error: '' };
        } catch (error) {
          if (controller.signal.aborted) return { ...capture, loading: false, url: '', error: '' };
          return { ...capture, loading: false, url: '', error: error.message || 'No fue posible cargar la captura.' };
        }
      })
    ).then((loadedItems) => {
      if (!controller.signal.aborted) setItems(loadedItems);
    });

    return () => {
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [captures, isOpen, token]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Auditoria privada"
      title={title}
      description="Estas imagenes solo estan disponibles para personal autorizado."
    >
      <div className={items.length > 1 ? 'grid gap-5 lg:grid-cols-2' : 'mx-auto max-w-3xl'}>
        {items.map((item, index) => (
          <article key={`${getLogId(item) || index}-${item.label || index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="font-semibold text-[#0f172a]">{item.label || 'Captura facial'}</h3>
                {item.createdAt && <p className="text-xs text-[#64748b]">{new Date(item.createdAt).toLocaleString('es-CO')}</p>}
              </div>
              <FiImage className="h-5 w-5 text-[#0f766e]" aria-hidden="true" />
            </div>
            <div className="flex min-h-72 items-center justify-center bg-slate-950">
              {item.loading ? (
                <p className="px-5 text-sm font-semibold text-white/80">Cargando captura...</p>
              ) : item.url ? (
                <img src={item.url} alt={`Captura facial de ${item.label || 'auditoria'}`} className="max-h-[65dvh] w-full object-contain" />
              ) : (
                <p className="px-5 text-center text-sm font-semibold text-rose-200">{item.error || 'Captura no disponible.'}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </ModalDialog>
  );
};

export default FaceCaptureViewer;
