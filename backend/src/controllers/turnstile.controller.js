const turnstile = require('../services/turnstile.service');

const sendResult = async (res, operation) => {
  try {
    const result = await operation();
    return res.status(200).json({
      status: result.success ? 'success' : 'warning',
      message: result.success ? 'Operacion de talanquera realizada' : 'La talanquera no pudo ejecutar la operacion',
      turnstile: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'No fue posible consultar la talanquera',
      error: error.message,
    });
  }
};

exports.getStatus = (req, res) => sendResult(res, () => turnstile.getStatus());
exports.open = (req, res) => sendResult(res, () => turnstile.open());
exports.close = (req, res) => sendResult(res, () => turnstile.close());
