import { Handler } from 'aws-lambda';
import { tracer } from '@/powertools/utilities';
import { wrapHandler } from '@/utils/wrap-handler';

const lambdaHandler: Handler = async (event) => {
  tracer.putMetadata('patientTemperatureRecordedReceived', event);
  console.log(event);
  return;
};

export const handler = wrapHandler(lambdaHandler);
