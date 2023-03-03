import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import express from '@feathersjs/express';
import * as Sentry from '@sentry/node';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { GraphQLClient } from 'graphql-request';
import logger from '../logger';
import services from '../services';
import appHooks from '../app.hooks';
import channels from '../channels';
import authentication from '../authentication';
import mongoose from '../mongoose';
import createMailer from '../mailer';

const config = configuration();
const f = feathers();
const app = express(f);

dayjs.extend(utc);

app.configure(config);
app.configure(mongoose);
app.configure(authentication);
app.configure(services);
app.configure(channels);
app.hooks(appHooks);

let transaction: any = null;

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

  const mailer = createMailer(app);

  const demarcheSimplifiee = app.get('demarche_simplifiee');

  const graphQLClient = new GraphQLClient(demarcheSimplifiee.endpoint, {
    headers: {
      authorization: `Bearer ${demarcheSimplifiee.token_api}`,
      'content-type': 'application/json',
    },
  });

  const jobComponents = {
    feathers: f,
    logger,
    exit,
    mailer,
    app,
    Sentry,
    graphQLClient,
  };

  try {
    const launchTime = new Date().getTime();
    await job(jobComponents);
    const duration = dayjs
      .utc(new Date().getTime() - launchTime)
      .format('HH:mm:ss.SSS');
    logger.info(`Completed in ${duration}`);
    exit();
  } catch (e) {
    exit(e);
  }
};

export default execute;
