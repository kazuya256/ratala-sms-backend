import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: (message as any).message || message,
    };

    if (status >= 400) {
      if (status >= 500) {
        this.logger.error(
          `${request.method} ${request.url} ${status} - Error: ${JSON.stringify(errorResponse)}`,
          (exception as Error).stack,
        );
      } else {
        this.logger.warn(
          `${request.method} ${request.url} ${status} - Details: ${JSON.stringify((message as any).message || message)}`,
        );
      }
    }

    response.status(status).json(errorResponse);
  }
}
