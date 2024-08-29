#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/conseillers/onboardingConseiller.ts

import execute from '../utils';
import service from '../../helpers/services';
import creationCompteConseiller from '../../emails/conseillers/creationCompteConseiller';
import { createMailbox, fixHomonymesCreateMailbox } from '../../utils/gandi';

const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

execute(__filename, async ({ app, logger, exit, mailer, delay, Sentry }) => {
  const conseillers = await app.service(service.conseillers).Model.find({
    $or: [{ 'emailCN.address': { $exists: false } }, { emailCNError: true }],
    statut: 'RECRUTE',
  });
  if (conseillers.length === 0) {
    exit();
    return;
  }
  for (const conseiller of conseillers) {
    // eslint-disable-next-line no-await-in-loop
    const user = await app.service(service.users).Model.findOne({
      'entity.$id': conseiller._id,
      roles: { $in: ['conseiller'] },
    });
    if (user) {
      const nom = slugify(`${conseiller.nom}`, {
        replacement: '-',
        lower: true,
        strict: true,
      });
      const prenom = slugify(`${conseiller.prenom}`, {
        replacement: '-',
        lower: true,
        strict: true,
      });
      // eslint-disable-next-line no-await-in-loop
      const login = await fixHomonymesCreateMailbox(app)(nom, prenom);
      const password = `${uuidv4()}AZEdsf;+:!`; // Sera choisi par le conseiller via invitation
      // eslint-disable-next-line no-await-in-loop
      const errorMailBoxCreate = await createMailbox(app)({
        conseillerId: conseiller._id,
        login,
        password,
      });
      if (errorMailBoxCreate instanceof Error) {
        logger.error(errorMailBoxCreate);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await delay(30000);
        const message = creationCompteConseiller(app, mailer);
        // eslint-disable-next-line no-await-in-loop
        const errorSmtpMail = await message
          .send(user)
          .catch((errSmtp: Error) => {
            return errSmtp;
          });
        if (errorSmtpMail instanceof Error) {
          logger.error(errorSmtpMail);
        } else {
          logger.info(
            `Email envoyé au conseiller ${conseiller.nom} ${conseiller.prenom}`,
          );
        }
      }
    } else {
      logger.error(
        `Le conseiller ${conseiller.nom} ${conseiller.prenom} n'a pas de compte`,
      );
      Sentry.captureException(
        `Le conseiller ${conseiller.nom} ${conseiller.prenom} n'a pas de compte`,
      );
    }
  }
  exit();
});
