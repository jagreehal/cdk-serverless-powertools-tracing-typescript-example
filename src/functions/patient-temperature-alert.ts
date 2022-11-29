import { Handler } from 'aws-lambda';
import { logger, metrics, tracer } from '@/powertools/utilities';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';

const lambdaHandler: Handler = async (event) => {
  tracer.putMetadata('patientTemperatureRecordedReceived', event);
  console.log(event);
  return;
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(injectLambdaContext(logger, { clearState: true }));
