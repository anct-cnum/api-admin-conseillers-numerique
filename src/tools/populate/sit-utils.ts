import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface IAwsConfig {
  region: string;
  access_key_id: string;
  secret_access_key: string;
  endpoint: string;
}

const awsUtils = (awsConfig: IAwsConfig) =>
  new S3Client({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.access_key_id,
      secretAccessKey: awsConfig.secret_access_key,
    },
    endpoint: awsConfig.endpoint,
  });

const uploadNdjsonToS3 = async ({
  awsConfig,
  bucket,
  key,
  body,
}: {
  awsConfig: IAwsConfig;
  bucket: string;
  key: string;
  body: string;
}) => {
  const s3 = awsUtils(awsConfig);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/x-ndjson',
    ACL: 'public-read' as const,
  };

  await s3.send(new PutObjectCommand(params));
};

export { IAwsConfig, awsUtils, uploadNdjsonToS3 };
