import { Handler } from 'aws-lambda';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { PatientStore } from '../store';
import { logger, metrics, tracer } from '@/powertools/utilities';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';

const store: PatientStore = new DynamoDbStore();
const lambdaHandler: Handler = async (event) => {
  tracer.putMetadata('patientTemperatureRecordedReceived', event);

  const { id, temperature } = event.detail;
  if (id === undefined || temperature === undefined) {
    logger.warn('Missing id or temperature', {
      details: { detail: event.detail },
    });

    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Missing id or temperature' }),
    };
  }

  await store.putPatientTemperature({ id, temperature });
  metrics.addMetric('patientTemperatureStored', MetricUnits.Count, 1);
  metrics.addMetadata('id', id);
  metrics.addMetadata('temperature', temperature);
  tracer.putAnnotation('id', id);
  tracer.putAnnotation('temperature', temperature);

  return;
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(injectLambdaContext(logger, { clearState: true }));
