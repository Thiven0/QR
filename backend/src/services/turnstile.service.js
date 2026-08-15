const { SerialPort } = require('serialport');
const createLogger = require('../utils/logger');

const logger = createLogger('turnstile');

const DEFAULT_BAUD_RATE = 9600;
const DEFAULT_RESPONSE_TIMEOUT_MS = 2500;
const DEFAULT_READY_TIMEOUT_MS = 5000;

const asPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isEnabled = () => !['0', 'false', 'off'].includes(String(process.env.TURNSTILE_ENABLED || 'true').trim().toLowerCase());

const getConfiguredMode = () => {
  const mode = String(process.env.TURNSTILE_MODE || 'auto').trim().toLowerCase();
  return ['auto', 'serial', 'simulated'].includes(mode) ? mode : 'auto';
};

class TurnstileService {
  constructor() {
    this.port = null;
    this.opening = null;
    this.buffer = '';
    this.waiters = [];
    this.readyWaiter = null;
    this.isReady = false;
    this.isOpen = false;
    this.lastResponse = null;
    this.lastResponseAt = null;
    this.lastError = null;
    this.lastActionAt = null;
  }

  getConfig() {
    return {
      enabled: isEnabled(),
      configuredMode: getConfiguredMode(),
      serialPort: String(process.env.TURNSTILE_SERIAL_PORT || '').trim(),
      baudRate: asPositiveNumber(process.env.TURNSTILE_BAUD_RATE, DEFAULT_BAUD_RATE),
      responseTimeoutMs: asPositiveNumber(process.env.TURNSTILE_RESPONSE_TIMEOUT_MS, DEFAULT_RESPONSE_TIMEOUT_MS),
      readyTimeoutMs: asPositiveNumber(process.env.TURNSTILE_READY_TIMEOUT_MS, DEFAULT_READY_TIMEOUT_MS),
    };
  }

  resolveMode(config = this.getConfig()) {
    if (!config.enabled) return 'disabled';
    if (config.configuredMode === 'simulated') return 'simulated';
    if (config.configuredMode === 'serial') return 'serial';
    return config.serialPort ? 'serial' : 'simulated';
  }

  handleLine(rawLine) {
    const line = String(rawLine || '').trim();
    if (!line) return;

    this.lastResponse = line;
    this.lastResponseAt = new Date().toISOString();
    this.lastError = null;
    if (line === 'OPENED' || line.startsWith('OPENED:') || line === 'STATUS:OPEN') this.isOpen = true;
    if (line === 'CLOSED' || line.startsWith('CLOSED:') || line === 'STATUS:CLOSED') this.isOpen = false;

    logger.info('Respuesta recibida del Arduino', {
      response: line,
      isOpen: this.isOpen,
    });

    if (line === 'READY' || line.startsWith('READY:')) {
      this.isReady = true;
      if (this.readyWaiter) {
        clearTimeout(this.readyWaiter.timeout);
        this.readyWaiter.resolve();
        this.readyWaiter = null;
      }
      logger.info('Arduino listo para recibir comandos');
    }

    const waiter = this.waiters.find((candidate) => candidate.matches(line));
    if (waiter) {
      this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
      clearTimeout(waiter.timeout);
      waiter.resolve(line);
    }
  }

  handleData(data) {
    this.buffer += data.toString('utf8');
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    lines.forEach((line) => this.handleLine(line));
  }

  markDisconnected(error) {
    if (error) {
      this.lastError = error.message || String(error);
    } else if (!this.lastError) {
      this.lastError = 'Conexion serial cerrada';
    }
    this.isReady = false;
    if (this.readyWaiter) {
      clearTimeout(this.readyWaiter.timeout);
      this.readyWaiter.reject(new Error(this.lastError));
      this.readyWaiter = null;
    }
    this.port = null;
    this.opening = null;
    logger.warn('Conexion serial de la talanquera no disponible', {
      error: this.lastError,
    });
  }

  async ensureSerialPort(config) {
    if (!config.serialPort) {
      throw new Error('TURNSTILE_SERIAL_PORT no esta configurado');
    }
    if (this.port?.isOpen && this.isReady) return this.port;
    if (this.opening) return this.opening;

    const serialPort = new SerialPort({
      path: config.serialPort,
      baudRate: config.baudRate,
      autoOpen: false,
    });

    serialPort.on('data', (data) => this.handleData(data));
    serialPort.on('error', (error) => this.markDisconnected(error));
    serialPort.on('close', () => this.markDisconnected());

    logger.info('Abriendo puerto serial de la talanquera', {
      port: config.serialPort,
      baudRate: config.baudRate,
    });

    this.opening = (async () => {
      await new Promise((resolve, reject) => {
        serialPort.open((error) => {
          if (error) {
            this.markDisconnected(error);
            reject(error);
            return;
          }
          this.port = serialPort;
          logger.info('Puerto serial de la talanquera abierto', {
            port: config.serialPort,
            baudRate: config.baudRate,
          });
          resolve();
        });
      });

      await this.waitForReady(config.readyTimeoutMs);
      return serialPort;
    })();

    try {
      return await this.opening;
    } finally {
      this.opening = null;
    }
  }

  waitForReady(timeoutMs) {
    if (this.isReady) return Promise.resolve();
    if (this.readyWaiter) return this.readyWaiter.promise;

    let waiter;
    const promise = new Promise((resolve, reject) => {
      waiter = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.readyWaiter = null;
          logger.warn('El Arduino no envio READY a tiempo', { timeoutMs });
          reject(new Error('El Arduino no envio READY a tiempo'));
        }, timeoutMs),
      };
    });
    this.readyWaiter = { ...waiter, promise };
    return promise;
  }

  waitForResponse(matches, timeoutMs) {
    return new Promise((resolve, reject) => {
      const waiter = {
        matches,
        resolve,
        timeout: setTimeout(() => {
          this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
          logger.warn('El Arduino no respondio a tiempo', { timeoutMs });
          reject(new Error('El Arduino no respondio a tiempo'));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  async sendSerialCommand(command, config) {
    const port = await this.ensureSerialPort(config);
    const expectedResponse = command === 'OPEN' ? 'OPENED' : command === 'CLOSE' ? 'CLOSED' : null;
    const expected = command === 'STATUS'
      ? (line) => line.startsWith('STATUS:')
      : (line) => line === expectedResponse || line.startsWith(`${expectedResponse}:`) || line === 'ERROR' || line.startsWith('ERROR:');
    const responsePromise = this.waitForResponse(expected, config.responseTimeoutMs);

    await new Promise((resolve, reject) => {
      port.write(`${command}\n`, (error) => (error ? reject(error) : resolve()));
    });
    logger.info('Comando serial enviado', {
      command,
      port: config.serialPort,
    });
    return responsePromise;
  }

  buildResult({ success, mode, command, response, fallbackReason } = {}) {
    return {
      success: Boolean(success),
      mode,
      command: command || null,
      isOpen: this.isOpen,
      response: response || this.lastResponse,
      lastResponseAt: this.lastResponseAt,
      fallbackReason: fallbackReason || null,
      timestamp: new Date().toISOString(),
    };
  }

  async execute(command) {
    const config = this.getConfig();
    const mode = this.resolveMode(config);
    this.lastActionAt = new Date().toISOString();

    if (mode === 'disabled') {
      logger.warn('Operacion ignorada: talanquera desactivada', { command });
      return this.buildResult({ success: false, mode, command, response: 'DISABLED' });
    }

    if (mode === 'simulated') {
      this.isOpen = command === 'OPEN' ? true : command === 'CLOSE' ? false : this.isOpen;
      const response = command === 'STATUS' ? `STATUS:${this.isOpen ? 'OPEN' : 'CLOSED'}` : command === 'OPEN' ? 'OPENED' : 'CLOSED';
      this.lastResponse = response;
      this.lastResponseAt = new Date().toISOString();
      this.lastError = null;
      logger.warn('Talanquera operando en modo simulado', { command, response });
      return this.buildResult({ success: true, mode, command, response });
    }

    try {
      const response = await this.sendSerialCommand(command, config);
      if (response === 'ERROR' || response.startsWith('ERROR:')) {
        throw new Error(`El Arduino rechazo el comando: ${response}`);
      }
      logger.info('Comando de talanquera completado', {
        command,
        mode,
        response,
      });
      return this.buildResult({ success: true, mode, command, response });
    } catch (error) {
      this.lastError = error.message;
      if (config.configuredMode === 'auto') {
        this.isOpen = command === 'OPEN' ? true : command === 'CLOSE' ? false : this.isOpen;
        const response = command === 'STATUS' ? `STATUS:${this.isOpen ? 'OPEN' : 'CLOSED'}` : command === 'OPEN' ? 'OPENED' : 'CLOSED';
        this.lastResponse = response;
        this.lastResponseAt = new Date().toISOString();
        logger.warn('Fallo serial: se activa la simulacion de la talanquera', {
          command,
          error: error.message,
        });
        return this.buildResult({
          success: true,
          mode: 'simulated',
          command,
          response,
          fallbackReason: error.message,
        });
      }
      logger.warn('No fue posible ejecutar el comando de talanquera', {
        command,
        mode,
        error: error.message,
      });
      return this.buildResult({ success: false, mode, command, response: 'ERROR' });
    }
  }

  async open() {
    return this.execute('OPEN');
  }

  async close() {
    return this.execute('CLOSE');
  }

  async getStatus() {
    const config = this.getConfig();
    const mode = this.resolveMode(config);
    if (mode === 'serial') {
      const result = await this.execute('STATUS');
      return {
        ...result,
        configuredPort: config.serialPort,
        baudRate: config.baudRate,
        connected: result.success && result.mode === 'serial',
        lastError: this.lastError,
        lastActionAt: this.lastActionAt,
      };
    }

    return {
      ...this.buildResult({ success: mode === 'simulated', mode, command: 'STATUS', response: mode === 'disabled' ? 'DISABLED' : `STATUS:${this.isOpen ? 'OPEN' : 'CLOSED'}` }),
      configuredPort: config.serialPort || null,
      baudRate: config.baudRate,
      connected: mode === 'simulated',
      lastError: this.lastError,
      lastActionAt: this.lastActionAt,
    };
  }
}

module.exports = new TurnstileService();
