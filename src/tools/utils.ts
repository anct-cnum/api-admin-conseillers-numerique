import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import express from '@feathersjs/express';
import Sentry from '@sentry/node';
import moment from 'moment';
import logger from '../logger';
import services from '../services';
import appHooks from '../app.hooks';
import channels from '../channels';
import authentication from '../authentication';
import mongoose from '../mongoose';
import createEmails from '../emails/emails';
import createMailer from '../mailer';

const config = configuration();
const f = feathers();
const app = express(f);

app.configure(config);
app.configure(mongoose);
app.configure(authentication);
app.configure(services);
app.configure(channels);
app.hooks(appHooks);

let transaction = null;

const execute = async (name: string, job: any) => {
  if (config().sentry.enabled === 'true') {
    Sentry.init({
      dsn: config().sentry.dsn,
      environment: config().sentry.environment,

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
    });
    transaction = Sentry.startTransaction({
      op: 'Lancement de script',
      name,
    });
    app.use(Sentry.Handlers.errorHandler());
    process.on('unhandledRejection', (e) => Sentry.captureException(e));
    process.on('uncaughtException', (e) => Sentry.captureException(e));
  } else {
    process.on('unhandledRejection', (e) => logger.error(e));
    process.on('uncaughtException', (e) => logger.error(e));
  }

  const exit = async (error = null) => {
    if (error) {
      logger.error(error);
      process.exitCode = 1;
    }
    if (transaction !== null) {
      transaction.finish();
    }
    setTimeout(() => {
      process.exit();
    }, 1000);
  };

  const mailerInstance = createMailer(app);
  const emails = createEmails(app, mailerInstance);

  const jobComponents = { feathers: f, logger, exit, emails, app, Sentry };

  try {
    const launchTime = new Date().getTime();
    await job(jobComponents);
    const duration = moment
      .utc(new Date().getTime() - launchTime)
      .format('HH:mm:ss.SSS');
    // eslint-disable-next-line no-console
    console.log(`Completed in ${duration}`);
    exit();
  } catch (e) {
    exit(e);
  }
};

export default execute;
