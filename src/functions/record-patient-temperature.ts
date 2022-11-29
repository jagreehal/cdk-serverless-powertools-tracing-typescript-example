import { logger, metrics, tracer } from '@/powertools/utilities';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

import middy from '@middy/core';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';

const eventBridgeClient = tracer.captureAWSv3Client(
  new EventBridgeClient({
    region: process.env.AWS_REGION,
  })
);

export const lambdaHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const id = event.pathParameters!.id;
  if (id === undefined) {
    logger.warn(
      "Missing 'id' parameter in path while trying to create a product",
      {
        details: { eventPathParameters: event.pathParameters },
      }
    );

    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: "Missing 'id' parameter in path" }),
    };
  }

  if (!event.body) {
    logger.warn(
      'Empty request body provided while trying to record a patient temperature'
    );

    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Empty request body' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
    if (typeof body !== 'object') {
      throw Error('Parsed product is not an object');
    }
  } catch (error) {
    logger.error('Unexpected error occurred while trying to create a product', {
      error,
    });

    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'Failed to parse product from request body',
      }),
    };
  }

  const { temperature } = body;

  if (temperature === undefined) {
    logger.error(`Temperature is a required field ${event.body}`);

    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'temperature is required',
      }),
    };
  }

  metrics.addMetric('temperatureRecorded', MetricUnits.Count, 1);
  metrics.addMetadata('patientId', id);
  metrics.addMetadata('temperature', temperature);
  tracer.putAnnotation('temperatureRecorded', true);

  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        Detail: JSON.stringify({ id, temperature: +temperature }),
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

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Temperature recorded',
    }),
  };
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(injectLambdaContext(logger, { clearState: true }));
