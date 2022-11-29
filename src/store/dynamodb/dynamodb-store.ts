import { PatientTemperature } from '../../model';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { tracer } from '../../powertools/utilities';
import { PatientStore } from '..';
import { getEnv } from '@/utils/get-env';

export class DynamoDbStore implements PatientStore {
  private static tableName = getEnv('TABLE_NAME');
  private static ddbClient: DynamoDBClient = captureAWSv3Client(
    new DynamoDBClient({})
  );
  private static ddbDocClient: DynamoDBDocumentClient =
    DynamoDBDocumentClient.from(DynamoDbStore.ddbClient);

  @tracer.captureMethod()
  public async putPatientTemperature({
    id,
    temperature,
  }: PatientTemperature): Promise<void> {
    const params: PutCommand = new PutCommand({
      TableName: DynamoDbStore.tableName,
      Item: {
        id,
        temperature,
      },
    });
    await DynamoDbStore.ddbDocClient.send(params);
  }
}
