export const ENV = process.env.ENV || 'dev';
export const STACK_NAME = `${ENV}-patient-health-tracing`;
export const TABLE_NAME = `${STACK_NAME}-table`;
export const AWS_REGION = process.env.AWS_REGION;
export const BUCKET_NAME = `${STACK_NAME}-s3-bucket`;
export const REST_API = `${STACK_NAME}-api`;
export const S3_UPLOAD_KEY_PREFIX = `uploads`;
export const PRE_SIGNED_URL_EXPIRATION_SECONDS = 300;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

// event bridge
export const EVENT_BUS_NAME = `${STACK_NAME}-event-bus`;
export const PATIENT_TEMPERATURE_RECORDED_RULE = `${STACK_NAME}-patient-temperature-recorded-rule`;
export const PATIENT_TEMPERATURE_HIGH_RULE = `${STACK_NAME}-patient-temperature-high-rule`;
export const PATIENT_TEMPERATURE_LOW_RULE = `${STACK_NAME}-patient-temperature-low-rule`;
