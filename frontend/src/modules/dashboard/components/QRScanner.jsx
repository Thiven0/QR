import { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import useAuth from '../../auth/hooks/useAuth';
import { apiRequest } from '../../../services/apiClient';

const renderEntries = (data) => {
  if (!data || typeof data !== 'object') return null;

  return Object.entries(data).map(([key, value]) => {
    const isObject = value && typeof value === 'object';
    const displayValue = isObject ? JSON.stringify(value, null, 2) : String(value ?? '');

    return (
      <div key={key} className="space-y-1">
        <dt className="text-sm font-semibold text-[#0f172a]">{key}</dt>
        <dd className="text-sm text-[#475569] whitespace-pre-wrap break-words">
          {isObject ? (
            <pre className="whitespace-pre-wrap break-words text-xs">{displayValue}</pre>
          ) : (
            displayValue
          )}
        </dd>
      </div>
    );
  });
};

const QRScannerPage = () => {
  const { token } = useAuth();
  const [scanData, setScanData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const handleScan = async (data) => {
    const rawText = data?.text?.trim();

    if (!rawText || processing || rawText === lastRawText) {
      return;
    }

    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Inicia sesion para procesar el escaneo.',
      });
      return;
    }

    setProcessing(true);
    setFeedback(null);
    setErrorMessage('');

    try {
      const parsedResponse = await apiRequest('/users/parse-scan', {
        method: 'POST',
        data: { rawText },
        token,
      });

      const parsedData = parsedResponse.data;
      const scannedAt = new Date().toISOString();
      const baseData = {
        rawText,
        scannedAt,
        parsed: parsedData,
      };

      setScanData(baseData);
      setLastRawText(rawText);

      const validationResponse = await apiRequest('/users/validate-scan', {
        method: 'POST',
        data: { data: parsedData },
        token,
      });

      const { userId, user, message } = validationResponse;

      setScanData((prev) => ({
        ...(prev || baseData),
        userId,
        user,
      }));

      setFeedback({
        type: 'success',
        message: message || 'Usuario encontrado',
      });

      if (userId) {
        const registroResponse = await apiRequest('/exitEntry/from-scan', {
          method: 'POST',
          data: { userId },
          token,
        });

        setScanData((prev) => ({
          ...(prev || baseData),
          userId,
          user,
          registro: registroResponse.data || registroResponse.registro || registroResponse,
        }));
      }
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo procesar el codigo escaneado.';
      setFeedback({
        type: 'error',
        message,
      });
      setLastRawText('');
    } finally {
      setProcessing(false);
      setTimeout(() => setLastRawText(''), 2000);
    }
  };

  const handleError = (error) => {
    console.error(error);
    setErrorMessage('No fue posible acceder a la camara.');
  };

  const handleReset = async () => {
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Inicia sesion para reiniciar el escaneo.',
      });
      return;
    }

    setResetting(true);
    setScanData(null);
    setFeedback(null);
    setErrorMessage('');
    setProcessing(false);
    setLastRawText('');
    setScannerKey((prev) => prev + 1);

    try {
      const response = await apiRequest('/exitEntry/reset-scan', {
        method: 'POST',
        token,
      });

      const message =
        response?.message ||
        response?.data?.message ||
        'Datos del escaneo limpiados. Puedes escanear nuevamente.';

      setFeedback({
        type: 'success',
        message,
      });
    } catch (error) {
      console.error(error);
      const message =
        error.details?.message ||
        error.message ||
        'No se pudo limpiar la informacion del escaneo.';
      setFeedback({
        type: 'error',
        message,
      });
    } finally {
      setResetting(false);
      setProcessing(false);
      setLastRawText('');
    }
  };

  const renderFeedback = () => {
    if (!feedback) return null;

    const isSuccess = feedback.type === 'success';
    const baseClasses = 'mt-6 rounded-lg border px-4 py-3 text-sm font-semibold';
    const successClasses = 'border-[#0f766e] bg-[#0f766e]/10 text-[#0b5f58]';
    const errorClasses = 'border-[#b91c1c] bg-[#fee2e2] text-[#7f1d1d]';

    return (
      <div className={`${baseClasses} ${isSuccess ? successClasses : errorClasses}`}>
        {feedback.message}
      </div>
    );
  };

  return (
    <section className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.45fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#00594e]">Control de accesos</p>
            <h1 className="text-3xl font-bold text-[#0f172a]">Escanear codigo QR</h1>
            <p className="text-sm text-[#475569]">
              Apunta la camara hacia el codigo para leerlo en segundos. La informacion detectada se mostrara a la derecha.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border-2 border-dashed border-[#00594e]/40 bg-[#f1f5f9] p-6">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-900/5">
              <QrScanner
                key={scannerKey}
                delay={400}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            {processing && (
              <p className="mt-3 text-center text-sm font-medium text-[#00594e]">Procesando escaneo...</p>
            )}
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-lg border border-[#B5A160] bg-[#B5A160]/10 px-4 py-3 text-sm font-semibold text-[#8c7030]">
              {errorMessage}
            </div>
          )}

          {renderFeedback()}

          <button
            type="button"
            onClick={handleReset}
            disabled={processing || resetting}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00594e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00463f] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
          >
            {resetting ? 'Limpiando...' : 'Escanear nuevamente'}
          </button>
        </article>

        <aside className="flex flex-col gap-6 rounded-2xl border border-[#00594e]/20 bg-white p-8 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-[#0f172a]">Resultado del escaneo</h2>
            {scanData ? (
              <dl className="mt-4 space-y-4">
                <div className="space-y-1">
                  <dt className="text-sm font-semibold text-[#0f172a]">Texto detectado</dt>
                  <dd className="text-sm text-[#475569] whitespace-pre-wrap break-words">{scanData.rawText}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm font-semibold text-[#0f172a]">Escaneado en</dt>
                  <dd className="text-sm text-[#475569]">{new Date(scanData.scannedAt).toLocaleString()}</dd>
                </div>
                {scanData.parsed && (
                  <div className="space-y-2">
                    <dt className="text-sm font-semibold text-[#0f172a]">Datos interpretados</dt>
                    <dd className="space-y-3">{renderEntries(scanData.parsed)}</dd>
                  </div>
                )}
                {scanData.user && (
                  <div className="space-y-2">
                    <dt className="text-sm font-semibold text-[#0f172a]">Usuario validado</dt>
                    <dd className="space-y-3">{renderEntries(scanData.user)}</dd>
                  </div>
                )}
                {scanData.registro && (
                  <div className="space-y-2">
                    <dt className="text-sm font-semibold text-[#0f172a]">Registro creado</dt>
                    <dd className="space-y-3">{renderEntries(scanData.registro)}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-[#475569]">
                Esperando un escaneo. Mantenga el codigo dentro del marco para ver la lectura aqui.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default QRScannerPage;
