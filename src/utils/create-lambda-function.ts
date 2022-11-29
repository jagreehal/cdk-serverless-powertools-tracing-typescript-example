import { Construct } from 'constructs';
import {
  NodejsFunction,
  NodejsFunctionProps,
  SourceMapMode,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { STACK_NAME } from '../config';

const nodeJsFunctionProps: NodejsFunctionProps = {
  bundling: {
    minify: true, // minify code, defaults to false
    sourceMap: true, // include source map, defaults to false
    sourceMapMode: SourceMapMode.INLINE, // defaults to SourceMapMode.DEFAULT
    sourcesContent: false, // do not include original source into source map, defaults to true
    target: 'es2020', // target environment for the generated JavaScript code
    externalModules: [
      'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
    ],
  },
  logRetention: logs.RetentionDays.ONE_DAY,
  runtime: Runtime.NODEJS_16_X,
  tracing: Tracing.ACTIVE,
};

export function createLambdaFunction({
  scope,
  id,
  file,
  props,
}: {
  scope: Construct;
  id: string;
  file?: string;
  props: NodejsFunctionProps;
}) {
  const functionName = `${STACK_NAME}-${id}`;
  const lambdaFunction = new NodejsFunction(scope, functionName, {
    entry: path.join(__dirname, `../functions/${file || id}.ts`),
    ...nodeJsFunctionProps,
    ...props,
    functionName,
  });

  return lambdaFunction;
}
