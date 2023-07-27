#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/onboardingConseiller.ts

import execute from '../utils';
import service from '../../helpers/services';
import creationCompteConseiller from '../../emails/conseillers/creationCompteConseiller';
import { createMailbox, fixHomonymesCreateMailbox } from '../../utils/gandi';

const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

execute(__filename, async ({ app, logger, exit, mailer, delay }) => {
  const conseillers = await app.service(service.conseillers).Model.find({
    $or: [{ emailCN: { $exists: false } }, { emailCNError: true }],
    statut: 'RECRUTE',
  });
  if (conseillers.length === 0) {
    exit();
  }
  for (const conseiller of conseillers) {
    const user = await app.service(service.users).Model.findOne({
      'entity.$id': conseiller._id,
      role: { $in: ['conseiller'] },
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
      const login = await fixHomonymesCreateMailbox(app)(nom, prenom);
      const password = `${uuidv4()}AZEdsf;+:!`; // Sera choisi par le conseiller via invitation
      const errorMailBoxCreate = await createMailbox(app)({
        conseillerId: conseiller._id,
        login,
        password,
      });
      if (errorMailBoxCreate instanceof Error) {
        logger.error(errorMailBoxCreate);
      } else {
        await delay(30000);
        const message = creationCompteConseiller(app, mailer);
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
    }
  }
  exit();
});
