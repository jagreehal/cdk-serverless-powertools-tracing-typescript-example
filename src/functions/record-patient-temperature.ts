import { logger, metrics, tracer } from '@/powertools/utilities';
import { createJsonResponse } from '@/utils/create-json-response';
import { wrapHttpHandler } from '@/utils/wrap-handler';
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import createHttpError from 'http-errors';

import { z } from 'zod';

const eventBridgeClient = tracer.captureAWSv3Client(
  new EventBridgeClient({
    region: process.env.AWS_REGION,
  })
);

const schema = z.object({
  body: z.object({
    temperature: z.number(),
  }),
  pathParameters: z.object({
    id: z.string(),
  }),
});

export const lambdaHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const validationResult = await schema.safeParseAsync(event);
  if (!validationResult.success) {
    logger.warn(validationResult.error.toString(), {
      details: {
        pathParameters: event.pathParameters,
        body: event.body,
      },
    });
    throw new createHttpError.BadRequest(validationResult.error.toString());
  }

  const { id } = validationResult.data.pathParameters;
  const { temperature } = validationResult.data.body;

  metrics.addMetric('temperatureRecorded', MetricUnits.Count, 1);
  metrics.addMetadata('patientId', id);
  metrics.addMetadata('temperature', temperature.toString());
  tracer.putAnnotation('temperatureRecorded', true);

  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        Detail: JSON.stringify({ id, temperature }),
        DetailType: 'PATIENT_TEMPERATURE_RECORDED',
        EventBusName: process.env.EVENT_BUS_NAME,
        Source: 'event.tracing',
      },
    ],
  });

  await eventBridgeClient.send(putEventsCommand);

  tracer.putMetadata('temperatureRecorded', { id, temperature });
  tracer.putAnnotation('id', id);
  tracer.putAnnotation('temperature', temperature);

  return createJsonResponse(
    {
      message: 'Temperature recorded',
    },
    201
  );
};

export const handler = wrapHttpHandler(lambdaHandler);
