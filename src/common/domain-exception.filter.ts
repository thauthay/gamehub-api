import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import type { Response } from 'express';
import { DomainError } from './domain.error';

/**
 * Converte regra de negócio violada e nome duplicado em 409. O @Catch lista só essas duas
 * classes de propósito: qualquer outro erro segue para o handler padrão do Nest (500).
 */
@Catch(DomainError, UniqueConstraintViolationException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const message =
      exception instanceof DomainError ? exception.message : 'A game with this name already exists';
    res.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message,
    });
  }
}
