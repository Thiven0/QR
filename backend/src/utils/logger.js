const LEVEL_VALUES = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const getLogLevel = () => {
  const level = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVEL_VALUES[level] !== undefined ? level : "info";
};

const shouldLog = (level, currentLevel) => {
  return LEVEL_VALUES[level] <= LEVEL_VALUES[currentLevel];
};

const serializeLog = (payload) => {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return JSON.stringify({
      level: "error",
      scope: "logger",
      msg: "No se pudo serializar el log",
      error: error.message,
    });
  }
};

const createLogger = (scope = "app") => {
  const currentLevel = getLogLevel();

  const emit = (level, msg, metadata = {}) => {
    if (!shouldLog(level, currentLevel)) {
      return;
    }

    const output = serializeLog({
      level,
      scope,
      msg,
      timestamp: new Date().toISOString(),
      ...metadata,
    });

    const consoleMethod = level === "error" ? "error" : level === "warn" ? "warn" : "log";
    console[consoleMethod](output);
  };

  return {
    info: (msg, metadata) => emit("info", msg, metadata),
    warn: (msg, metadata) => emit("warn", msg, metadata),
    error: (msg, metadata) => emit("error", msg, metadata),
    debug: (msg, metadata) => emit("debug", msg, metadata),
  };
};

module.exports = createLogger;
