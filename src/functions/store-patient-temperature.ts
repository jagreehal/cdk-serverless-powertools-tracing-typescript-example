import { Handler } from 'aws-lambda';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { PatientStore } from '../store';
import { logger, metrics, tracer } from '@/powertools/utilities';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { z } from 'zod';
import createHttpError from 'http-errors';
import { wrapHandler } from '@/utils/wrap-handler';

const schema = z.object({
  detail: z.object({
    id: z.string(),
    temperature: z.number(),
  }),
});

const store: PatientStore = new DynamoDbStore();
const lambdaHandler: Handler = async (event) => {
  tracer.putMetadata('patientTemperatureRecordedReceived', event);

  const validationResult = await schema.safeParseAsync(event);
  if (!validationResult.success) {
    logger.warn(validationResult.error.toString(), {
      detail: event.detail,
    });
    throw new createHttpError.BadRequest(validationResult.error.toString());
  }

  const { id, temperature } = validationResult.data.detail;

  await store.putPatientTemperature({ id, temperature });
  metrics.addMetric('patientTemperatureStored', MetricUnits.Count, 1);
  metrics.addMetadata('id', id);
  metrics.addMetadata('temperature', temperature.toString());
  tracer.putAnnotation('id', id);
  tracer.putAnnotation('temperature', temperature);

  return;
};

export const handler = wrapHandler(lambdaHandler);
