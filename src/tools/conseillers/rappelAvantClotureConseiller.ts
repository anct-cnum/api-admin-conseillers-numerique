#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/rappelAvantClotureConseiller.ts

import dayjs from 'dayjs';
import execute from '../utils';
import mailer from '../../mailer';

import { rappelSuppressionCompteConseiller } from '../../emails';
import {
  getMisesEnRelationsFinaliseesNaturelles,
  getConseiller,
} from '../../utils/functionsDeleteRoleConseiller';

execute(__filename, async ({ app, logger, exit, delay, Sentry }) => {
  try {
    const today = new Date();
    // Obtenir la date de fin de contrat 7 jours avant la cloture (2 mois après la fin de contrat)
    const dateFinContrat = dayjs(today).add(7, 'day').subtract(2, 'month');
    const dateFinContratDebut = dayjs(dateFinContrat).startOf('date').toDate();
    const dateFinContratFin = dayjs(dateFinContrat).endOf('date').toDate();

    logger.info(
      `Envoi d'un rappel par email avant la clôture du contrat des conseillers`,
    );
    const termineesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
    )(dateFinContratDebut, dateFinContratFin);

    if (termineesNaturelles.length === 0) {
      logger.info(
        `Fin de contrat naturelle : aucun rappel avant clôture n'est à effectuer`,
      );
      exit();
      return;
    }

    for (const termineeNaturelle of termineesNaturelles) {
      const structuresIdsRecruteeEtFinalisee =
        termineeNaturelle.structuresIdsAutre.filter(
          (structureId) => structureId !== null,
        );
      // Contrôler si le conseiller qui est en fin de contrat n'est pas réembauché (recrutee, finalisee)
      if (structuresIdsRecruteeEtFinalisee.length === 0) {
        const conseiller = await getConseiller(app)(
          termineeNaturelle.conseillerId,
        );
        // Envoi des emails de rappel de cloture de compte
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
