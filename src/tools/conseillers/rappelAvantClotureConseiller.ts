#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/rappelAvantClotureConseiller.ts -l <limit>

import { program } from 'commander';
import dayjs from 'dayjs';
import mailer from '../../mailer';

import { rappelSuppressionCompteConseiller } from '../../emails';
import {
  getMisesEnRelationsFinaliseesNaturelles,
  getConseiller,
} from '../../utils/functionsDeleteRoleConseiller';

const { execute, delay } = require('../utils');

program
  .option(
    '-l --limit <limit>',
    'limite le nombre de traitement (par défaut: 1)',
    parseInt,
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const options = program.opts();
    const { limit } = options;
    const updatedAt = new Date();
    const dateMoins7jours = dayjs(updatedAt).subtract(7, 'day');

    logger.info(
      `Envoi d'un rappel par email avant la clôture du contrat des conseillers`,
    );
    const termineesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
      limit,
    )(dateMoins7jours);

    if (termineesNaturelles.length === 0) {
      logger.info(
        `Fin de contrat naturelle : aucun rappel avant clôture n'est à effectuer`,
      );
      exit();
      return;
    }

    for (const termineeNaturelle of termineesNaturelles) {
      const conseiller = await getConseiller(app)(
        termineeNaturelle.conseiller.oid,
      );
      // Envoi des emails de cloture de compte pour PIX / le conseiller / la structure
      const mailerInstance = mailer(app);
      const messageRappelSuppressionConseiller =
        rappelSuppressionCompteConseiller(mailerInstance);
      const errorSmtpMailRappelSuppressionConseiller =
        await messageRappelSuppressionConseiller
          .send(conseiller)
          .catch((errSmtp: Error) => {
            logger.error(errSmtp);
            Sentry.captureException(errSmtp);
          });
      if (errorSmtpMailRappelSuppressionConseiller instanceof Error) {
        logger.error(errorSmtpMailRappelSuppressionConseiller.message);
        Sentry.captureException(
          errorSmtpMailRappelSuppressionConseiller.message,
        );
      }

      await delay(1000);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  logger.info(
    `Fin d'envoi d'un rappel par email avant la clôture du contrat des conseillers`,
  );
  exit();
});
