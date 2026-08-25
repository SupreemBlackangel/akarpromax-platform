const isDev = process.env.NODE_ENV === 'development';

function log(level: string, message: string, context?: Record<string, unknown>) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  if (isDev) console.log(JSON.stringify(entry));
  else if (level !== 'debug') console.log(JSON.stringify(entry));
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getErrorStack(err: unknown): string | undefined {
  if (err instanceof Error) return err.stack;
  return undefined;
}

export const logger = {
  info: (message: string, ctx?: Record<string, unknown>) => log('info', message, ctx),
  error: (err: unknown, ctx?: Record<string, unknown>) => log('error', getErrorMessage(err), { ...ctx, stack: getErrorStack(err) }),
  warn: (message: string, ctx?: Record<string, unknown>) => log('warn', message, ctx),
  debug: (message: string, ctx?: Record<string, unknown>) => log('debug', message, ctx),
};

export function createLogger(module: string) {
  return {
    info: (msg: string, ctx?: Record<string, unknown>) => logger.info(`[${module}] ${msg}`, ctx),
    error: (err: unknown, ctx?: Record<string, unknown>) => logger.error(err, { ...ctx, module }),
    warn: (msg: string, ctx?: Record<string, unknown>) => logger.warn(`[${module}] ${msg}`, ctx),
    debug: (msg: string, ctx?: Record<string, unknown>) => logger.debug(`[${module}] ${msg}`, ctx),
  };
}
