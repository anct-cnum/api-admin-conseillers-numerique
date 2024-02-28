import path from 'path';
import compress from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import express from '@feathersjs/express';
import socketio from '@feathersjs/socketio';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';
import logger from './logger';
import services from './services';
import appHooks from './app.hooks';
import channels from './channels';
import authentication from './authentication';
import mongoose from './mongoose';

const app = express(feathers());

// Init Sentry
const config = configuration();
if (config().sentry.enabled === 'true') {
  Sentry.init({
    dsn: config().sentry.dsn,
    environment: config().sentry.environment,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
    // Ne doit partir en erreur si le client ferme le navigateur avant la fin de la requête
    ignoreErrors: [/request aborted/i],
  });
  // transaction/span/breadcrumb is attached to its own Hub instance
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(cookieParser());
// Load app configuration
app.configure(configuration());

// Enable security, CORS, compression, favicon and body parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(compress());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(favicon(path.join(__dirname, 'favicon.ico')));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Set up Plugins and providers
app.configure(express.rest());
app.configure(socketio());

app.use((req, res, next) => {
  req.feathers.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  next();
});

app.configure(mongoose);
app.use(cors({ origin: config().dashboard_hostname, credentials: true }));

app.configure(authentication);
// Set up our services (see `services/index.js`)
app.configure(services);
// Set up event channels (see channels.js)
app.configure(channels);

// Configure a middleware for 404s and the error handler
app.use(express.notFound());

if (config().sentry.enabled === 'true') {
  // The error handler must be before any other error middleware and after all controllers
  app.use(
    Sentry.Handlers.errorHandler({
      shouldHandleError(error: any) {
        // No capture 401 (invalid login) and 404 (not found de feathers)
        if (error.code === 401 || error.code === 404) {
          return false;
        }
        return true;
      },
    }),
  );
}
app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

export default app;
