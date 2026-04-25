import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';

type ConstraintMessages = Record<string, string>;

interface DriverErrorLike {
  code?: string;
  constraint?: string;
}

export interface PersistenceErrorOptions {
  defaultMessage: string;
  duplicateMessage?: string;
  foreignKeyMessage?: string;
  notNullMessage?: string;
  checkMessage?: string;
  constraintMessages?: ConstraintMessages;
}

function getDriverError(error: unknown): DriverErrorLike | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const nested = (error as { driverError?: DriverErrorLike }).driverError;
  if (nested && typeof nested === 'object') {
    return nested;
  }

  return error as DriverErrorLike;
}

export function throwPersistenceError(
  error: unknown,
  options: PersistenceErrorOptions,
): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const driverError = getDriverError(error);
  const constraint = driverError?.constraint;
  const constraintMessage = constraint
    ? options.constraintMessages?.[constraint]
    : undefined;

  switch (driverError?.code) {
    case '23505':
      throw new ConflictException(
        constraintMessage ?? options.duplicateMessage ?? 'Resource already exists',
      );
    case '23503':
      throw new BadRequestException(
        constraintMessage ??
          options.foreignKeyMessage ??
          'A related resource does not exist',
      );
    case '23502':
      throw new BadRequestException(
        constraintMessage ?? options.notNullMessage ?? 'A required field is missing',
      );
    case '23514':
      throw new BadRequestException(
        constraintMessage ?? options.checkMessage ?? 'Provided data is invalid',
      );
    default:
      throw new InternalServerErrorException(options.defaultMessage);
  }
}
