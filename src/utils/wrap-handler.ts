import middy from '@middy/core';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { Handler } from 'aws-lambda';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logger, metrics, tracer } from '@/powertools/utilities';
import { logMetrics } from '@aws-lambda-powertools/metrics';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';

const powerToolsMiddleware = [
  captureLambdaHandler(tracer),
  logMetrics(metrics, { captureColdStartMetric: true }),
  injectLambdaContext(logger, { clearState: true }),
];

export function wrapHandler(handler: Handler) {
  const fn = middy().use(powerToolsMiddleware);
  return fn.handler(handler);
}

export function wrapHttpHandler(handler: Handler) {
  const fn = middy().use([
    httpHeaderNormalizer(),
    httpJsonBodyParser(),
    httpErrorHandler(),
    ...powerToolsMiddleware,
  ]);

  return fn.handler(handler);
}
