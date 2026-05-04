import { LoggerService, ConsoleLogger, Scope } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

const { combine, timestamp, printf, errors } = winston.format;

// Custom format for structured logs
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

export class WinstonLoggerService extends ConsoleLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    super();
    const logDir = process.env.LOG_DIR || 'logs';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        customFormat,
      ),
      defaultMeta: { service: 'rps-backend' },
      transports: [
        // Console transport for dev
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            customFormat,
          ),
        }),
        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        // Daily rotate file for errors only
        new DailyRotateFile({
          filename: join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
        }),
      ],
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  log(message: string, ...args: any[]) {
    this.logger.info(message, args);
  }

  error(message: string, ...args: any[]) {
    this.logger.error(message, args);
  }

  warn(message: string, ...args: any[]) {
    this.logger.warn(message, args);
  }

  debug(message: string, ...args: any[]) {
    this.logger.debug(message, args);
  }

  verbose(message: string, ...args: any[]) {
    this.logger.verbose(message, args);
  }
}
