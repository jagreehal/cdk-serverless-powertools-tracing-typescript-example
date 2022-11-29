import middy from '@middy/core';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { zodValidator } from './zod-validator';
import { ZodSchema } from 'zod';
import { Handler } from 'aws-lambda';

export function wrapHandler<T>(handler: Handler, schema?: ZodSchema<T>) {
  const fn = middy().use([
    httpHeaderNormalizer(),
    httpJsonBodyParser(),
    httpErrorHandler(),
  ]);

  if (schema) {
    fn.use(zodValidator(schema));
  }

  return fn.handler(handler);
}
