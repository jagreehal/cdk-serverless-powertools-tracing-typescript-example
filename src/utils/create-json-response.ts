import { APIGatewayProxyResult } from 'aws-lambda';

export function createJsonResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(data),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
}
