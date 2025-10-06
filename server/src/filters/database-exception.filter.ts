import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

@Catch(Error)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    if (
      exception.message.includes(
        'duplicate key value violates unique constraint',
      )
    ) {
      const constraintMatch = exception.message.match(
        /unique constraint "([^"]+)"/,
      );
      const constraintName = constraintMatch ? constraintMatch[1] : 'unknown';

      response.status(409).json({
        statusCode: 409,
        message: `The submitted data violates the ${constraintName} rule.`,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (
      exception.message.includes('relation') &&
      exception.message.includes('does not exist')
    ) {
      response.status(500).json({
        statusCode: 500,
        message: 'Database table or relation not found',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (
      exception.message.includes('connection') ||
      exception.message.includes('ECONNREFUSED')
    ) {
      response.status(503).json({
        statusCode: 503,
        message: 'Database connection failed',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (
      exception.message.includes('syntax error') ||
      exception.message.includes('invalid input syntax')
    ) {
      response.status(400).json({
        statusCode: 400,
        message: 'Invalid database query syntax',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (exception.message.includes('violates foreign key constraint')) {
      const constraintMatch = exception.message.match(
        /foreign key constraint "([^"]+)"/,
      );
      const constraintName = constraintMatch
        ? constraintMatch[1]
        : 'foreign key';

      response.status(400).json({
        statusCode: 400,
        message: `Referenced record does not exist (${constraintName})`,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (exception.message.includes('violates check constraint')) {
      const constraintMatch = exception.message.match(
        /check constraint "([^"]+)"/,
      );
      const constraintName = constraintMatch ? constraintMatch[1] : 'check';

      response.status(400).json({
        statusCode: 400,
        message: `Data violates ${constraintName} constraint`,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw exception;
    }
  }
}
