#!/usr/bin/env node
import execute from '../utils';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';

// ts-node src/tools/scripts/add-quotas-demandes-coselec.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const structuresATraiter = await app
      .service(service.structures)
      .Model.find({
        demandesCoselec: {
          $exists: true,
          $size: 1,
          $elemMatch: { statut: 'en_cours' },
        },
      });

    logger.info(
      `Nombre de structures à traiter: ${structuresATraiter?.length}`,
    );

    for (const structure of structuresATraiter) {
      try {
        const coselec = getCoselec(structure).nombreConseillersCoselec;
        if (coselec === 0) {
          logger.warn(
            `La structure ${structure.idPG} n'a pas de conseiller COSELEC`,
          );
        }
        // eslint-disable-next-line no-await-in-loop
        await app.service(service.structures).Model.updateOne(
          { _id: structure._id },
          {
            $set: {
              'demandesCoselec.0.nbPostesAvantDemande': coselec,
            },
          },
        );
        logger.info(`La structure ${structure.idPG} a été mise à jour`);
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la structure ${structure.idPG}: ${error}`,
        );
      }
    }
    logger.info('Fin du traitement');
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
