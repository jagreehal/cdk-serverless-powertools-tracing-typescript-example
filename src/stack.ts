import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { createLambdaFunction } from './utils/create-lambda-function';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';

import {
  EVENT_BUS_NAME,
  PATIENT_TEMPERATURE_HIGH_RULE,
  PATIENT_TEMPERATURE_LOW_RULE,
  PATIENT_TEMPERATURE_RECORDED_RULE,
  REST_API,
  TABLE_NAME,
} from './config';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Stack } from 'aws-cdk-lib';

interface ServerTracingExample extends cdk.StackProps {}

export class ServerlessTracingExample extends cdk.Stack {
  constructor(app: cdk.App, id: string, props?: ServerTracingExample) {
    super(app, id, props);

    const envVariables = {
      AWS_ACCOUNT_ID: Stack.of(this).account,
      POWERTOOLS_SERVICE_NAME: 'serverless-tracing-example',
      POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_METRICS_NAMESPACE: 'jagreehal',
    };

    const eventBus = new EventBus(this, EVENT_BUS_NAME, {
      eventBusName: EVENT_BUS_NAME,
    });

    const patientTable = new dynamodb.Table(this, TABLE_NAME, {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: TABLE_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const recordPatientTemperatureFunction = createLambdaFunction({
      scope: this,
      id: 'record-patient-temperature',
      props: {
        environment: {
          ...envVariables,
          EVENT_BUS_NAME: eventBus.eventBusName,
          TABLE_NAME: patientTable.tableName,
        },
      },
    });
    eventBus.grantPutEventsTo(recordPatientTemperatureFunction);

    const storePatientTemperatureFunction = createLambdaFunction({
      scope: this,
      id: 'store-patient-temperature',
      props: {
        environment: {
          ...envVariables,
          TABLE_NAME: patientTable.tableName,
        },
      },
    });
    patientTable.grant(storePatientTemperatureFunction, 'dynamodb:PutItem');

    const patientTemperatureAlertFunction = createLambdaFunction({
      scope: this,
      id: 'patient-temperature-alert',
      props: {
        environment: {
          ...envVariables,
        },
      },
    });

    // API
    const api = new RestApi(this, REST_API, {
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowCredentials: true,
        allowOrigins: Cors.ALL_ORIGINS,
      },
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    });

    // API PATIENT ROUTE
    const patient = api.root.addResource('patient');
    const patientWithId = patient.addResource('{id}');
    patientWithId.addMethod(
      'POST',
      new LambdaIntegration(recordPatientTemperatureFunction),
      {}
    );

    // RULES
    new Rule(this, PATIENT_TEMPERATURE_RECORDED_RULE, {
      eventBus: eventBus,
      eventPattern: {
        detailType: ['PATIENT_TEMPERATURE_RECORDED'],
      },
      targets: [new LambdaFunction(storePatientTemperatureFunction)],
    });

    new Rule(this, PATIENT_TEMPERATURE_HIGH_RULE, {
      eventBus: eventBus,
      eventPattern: {
        detailType: ['PATIENT_TEMPERATURE_RECORDED'],
        detail: {
          temperature: [{ numeric: ['>=', 38] }],
        },
      },
      targets: [new LambdaFunction(patientTemperatureAlertFunction)],
    });

    new Rule(this, PATIENT_TEMPERATURE_LOW_RULE, {
      eventBus: eventBus,
      eventPattern: {
        detailType: ['PATIENT_TEMPERATURE_RECORDED'],
        detail: {
          temperature: [{ numeric: ['<', 36] }],
        },
      },
      targets: [new LambdaFunction(patientTemperatureAlertFunction)],
    });

    new cdk.CfnOutput(this, 'API_URL', {
      value: api.url,
    });

    app.synth();
  }
}
