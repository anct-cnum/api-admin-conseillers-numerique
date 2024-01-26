import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Application } from './declarations';

const path = require('path');
const { promisify } = require('util');
const lodash = require('lodash');
const { htmlToText } = require('nodemailer-html-to-text');
const nodemailer = require('nodemailer');
const mjml = require('mjml');
const ejs = require('ejs');
const { dayjs } = require('dayjs');
const Joi = require('joi');

const renderFile = promisify(ejs.renderFile);

const configuration = require('@feathersjs/configuration');

const config = configuration();

export default function (app: Application) {
  const configurationSmtp = app.get('smtp');
  const transporter = nodemailer.createTransport({
    name: configurationSmtp.hostname,
    host: configurationSmtp.host,
    port: configurationSmtp.port,
    secure: configurationSmtp.secure === 'true',
    greetingTimeout: parseInt(configurationSmtp.greetingTimeout, 10),
    tls: {
      rejectUnauthorized: false,
    },
    ...(!configurationSmtp.user
      ? {}
      : {
          auth: {
            user: configurationSmtp.user,
            pass: configurationSmtp.password,
          },
        }),
  });

  transporter.use('compile', htmlToText({ ignoreImage: true }));

  const getDashboardUrl = (pathUrl: string) =>
    `${app.get('dashboard_hostname')}${pathUrl}`;

  const getEspaceCandidatUrl = (pathUrl: string) =>
    `${app.get('espace_candidat_hostname')}${pathUrl}`;

  const getEspaceCoopUrl = (pathUrl: string) =>
    `${app.get('espace_coop_hostname')}${pathUrl}`;

  const getPublicUrl = (pathUrl: string) => `${app.get('public')}${pathUrl}`;

  const getQuestionFinContratUrl = () => app.get('url_question_contrat');

  const getSupportMail = () => configurationSmtp.replyTo;

  const initSentry = () => {
    if (config().sentry.enabled === 'true') {
      Sentry.init({
        dsn: config().sentry.dsn,
        environment: config().sentry.environment,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Tracing.Integrations.Express({ app }),
        ],
        tracesSampleRate: parseFloat(config().sentry.traceSampleRate),
      });
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
      app.use(Sentry.Handlers.errorHandler());
    }
  };
  const getPixContactMail = () => app.get('pix').contactMailing;
  const getPixSupportMail = () => app.get('pix').supportMailing;

  const utils = {
    getPublicUrl,
    getDashboardUrl,
    initSentry,
    getPixContactMail,
    getPixSupportMail,
    getEspaceCandidatUrl,
    getEspaceCoopUrl,
    getQuestionFinContratUrl,
    getSupportMail,
  };
  return {
    utils,
    render: async (rootDir, templateName, data = {}) => {
      const mjmlTemplate = await renderFile(
        path.join(rootDir, `${templateName}.mjml.ejs`),
        {
          ...data,
          templateName,
          utils: { dayjs, ...utils },
        },
      );
      return mjml(mjmlTemplate, {}).html;
    },
    createMailer: () => {
      return {
        sendEmail: async (
          emailAddress,
          message,
          options = {},
          carbonCopy = null,
        ) => {
          const schema = await Joi.object(
            {
              subject: Joi.string().required(),
              body: Joi.string().required(),
            },
            { abortEarly: false },
          );
          const { subject, body } = schema.validate(message).value;
          return transporter.sendMail(
            lodash.merge(
              {},
              {
                to: emailAddress,
                subject,
                from: `Conseiller Numérique <${configurationSmtp.from}>`,
                replyTo: `Conseiller Numérique <${configurationSmtp.replyTo}>`,
                list: {
                  help: getPublicUrl('/faq'),
                },
                html: body,
                ...(carbonCopy !== null ? { cc: carbonCopy } : {}),
              },
              {
                ...options,
                ...(process.env.CNUM_MAIL_BCC
                  ? { bcc: process.env.CNUM_MAIL_BCC }
                  : {}),
              },
            ),
          );
        },
      };
    },
  };
}
