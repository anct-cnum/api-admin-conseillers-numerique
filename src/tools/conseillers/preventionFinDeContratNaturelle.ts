#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/preventionFinDeContratNaturelle.ts

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import mailer from '../../mailer';
import service from '../../helpers/services';
import {
  getConseiller,
  updateConseillersPG,
} from '../../utils/functionsDeleteRoleConseiller';
import {
  preventionSuppressionConseiller,
  prenventionSuppressionConseillerStructure,
} from '../../emails';

const { Pool } = require('pg');

const getMisesEnRelationsFinContrat =
  (app) => async (dateDuJourDebut, dateDuJourFin) =>
    app.service(service.misesEnRelation).Model.find({
      dateFinDeContrat: { $gte: dateDuJourDebut, $lte: dateDuJourFin },
      statut: 'finalisee',
      typeDeContrat: { $ne: 'CDI' },
      reconventionnement: { $ne: true },
    });

// insertion du nouveau flag dans le statut afin de gérer les cas de fin de contrat naturelle
// statut créer pour identifer les contrats terminés mais qui ont toujours accès aux outils Conum
// avant de les passer en terminer à M+2 de la fin de contrat
const updateMiseEnRelation = (app) => async (id, updatedAt) =>
  app.service(service.misesEnRelation).Model.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        statut: 'terminee_naturelle',
        'conseillerObj.statut': 'TERMINE',
        'conseillerObj.updatedAt': updatedAt,
      },
    },
  );

const updateConseiller = (app) => async (idConseiller, updatedAt) =>
  app.service(service.conseillers).Model.updateOne(
    {
      id: idConseiller,
    },
    {
      $set: {
        statut: 'TERMINE',
        updatedAt,
      },
    },
  );

program
  .option(
    '-f, --fix',
    'fix: mise à jour des mises en relation en statut terminee_naturelle',
  )
  .option(
    '-ee, --envoiEmail',
    'envoiEmail: Envoyer les emails de prévention de suppression',
  )
  .option(
    '-fdb, --flagDateDebut',
    'flagDateDebut: prendre la date du début du dispositif',
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const options = program.opts();
    const dateDuJour = new Date();
    const { fix, envoiEmail, flagDateDebut } = options;

    const misesEnRelationsFinContrat = await getMisesEnRelationsFinContrat(app)(
      dayjs(flagDateDebut ? new Date('2020/11/01') : dateDuJour)
        .startOf('date')
        .toDate(),
      dayjs(dateDuJour).endOf('date').toDate(),
    );

    if (misesEnRelationsFinContrat.length === 0) {
      logger.info(`Fin de contrat naturel : aucun contrat en cours à terminer`);
      exit();
      return;
    }
    logger.info(
      `Il y a ${misesEnRelationsFinContrat.length} contrat(s) encore en cours dont la date de fin de contrat est dépassée.`,
    );
    for (const miseEnRelationFinContrat of misesEnRelationsFinContrat) {
      const conseiller = await getConseiller(app)(
        miseEnRelationFinContrat.conseiller.oid,
      );
      logger.info(
        // eslint-disable-next-line
        `Le conseiller (idPG: ${conseiller.idPG}) possède un contrat en cours dont la date de fin de contrat est au ${dayjs(miseEnRelationFinContrat.dateFinDeContrat).format('DD-MM-YYYY')}.`,
      );

      if (fix) {
        const pool = new Pool();
        const datePG = dayjs(dateDuJour).format('YYYY-MM-DD');
        await updateConseillersPG(pool)(conseiller.email, true, datePG).then(
          async () => {
            await updateConseiller(app)(conseiller._id, dateDuJour);
            logger.info(
              `Le conseiller a été passé en statut 'TERMINE' (id: ${conseiller._id})`,
            );
          },
        );

        await updateMiseEnRelation(app)(
          miseEnRelationFinContrat._id,
          dateDuJour,
        ).then(async () => {
          logger.info(
            `Le conseiller (idPG: ${
              conseiller.idPG
            }) passe en fin de contrat naturelle - date de fin de contrat est au ${dayjs(
              miseEnRelationFinContrat.dateFinDeContrat,
            ).format('DD-MM-YYYY')}`,
          );
        });
        // Envoie de mail conseiller et structure
        if (envoiEmail) {
          const mailerInstance = mailer(app);
          const messagePreventionFinContrat =
            preventionSuppressionConseiller(mailerInstance);
          const errorSmtpMailPreventionFinContratNaturelle =
            await messagePreventionFinContrat
              .send(conseiller)
              .catch((errSmtp: Error) => {
                logger.error(errSmtp);
                Sentry.captureException(errSmtp);
              });
          if (errorSmtpMailPreventionFinContratNaturelle instanceof Error) {
            logger.error(errorSmtpMailPreventionFinContratNaturelle.message);
            Sentry.captureException(
              errorSmtpMailPreventionFinContratNaturelle.message,
            );
          }

          const messagePreventionFinContratStructure =
            prenventionSuppressionConseillerStructure(mailerInstance);
          const errorSmtpMailPreventionFinContratStructure =
            await messagePreventionFinContratStructure
              .send(
                conseiller.idPG,
                miseEnRelationFinContrat.structureObj.idPG,
                miseEnRelationFinContrat.structureObj.email,
              )
              .catch((errSmtp: Error) => {
                logger.error(errSmtp);
                Sentry.captureException(errSmtp);
              });
          if (errorSmtpMailPreventionFinContratStructure instanceof Error) {
            logger.error(errorSmtpMailPreventionFinContratStructure.message);
            Sentry.captureException(
              errorSmtpMailPreventionFinContratStructure.message,
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  exit();
});
