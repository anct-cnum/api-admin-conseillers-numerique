import path from 'path';
import compress from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import feathers from '@feathersjs/feathers';
import configuration from '@feathersjs/configuration';
import express from '@feathersjs/express';
import socketio from '@feathersjs/socketio';
import * as Sentry from '@sentry/node';
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
      Sentry.httpIntegration(),
      // enable Express.js middleware tracing
      Sentry.expressIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
    // Ne doit partir en erreur si le client ferme le navigateur avant la fin de la requête
    ignoreErrors: [/request aborted/i],
    beforeSend(event, hint) {
      const error = hint.originalException as any;
      // No capture 401 (invalid login) and 404 (not found de feathers)
      if (error?.code === 401 || error?.code === 404) {
        return null;
      }
      return event;
    },
  });
  Sentry.setupExpressErrorHandler(app);
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
app.use(
  cors({
    origin: [
      config().dashboard_hostname,
      config().public,
      config().public_site_vitrine,
    ],
    credentials: true,
  }),
);

app.configure(authentication);
// Set up our services (see `services/index.js`)
app.configure(services);
// Set up event channels (see channels.js)
app.configure(channels);

// Debug Sentry - à supprimer après validation
app.get('/debug-sentry', () => {
  throw new Error('Test Sentry migration v8');
});

// Configure a middleware for 404s and the error handler
app.use(express.notFound());

app.use(express.errorHandler({ logger }));

app.hooks(appHooks);

export default app;
