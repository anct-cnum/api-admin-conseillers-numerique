import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Application } from '../declarations';

const configuration = require('@feathersjs/configuration');

const config = configuration();

export default function initSentry(app: Application) {
  Sentry.init({
    dsn: config().sentry.dsn,
    environment: config().sentry.environment,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
  });

  return Sentry;
}
