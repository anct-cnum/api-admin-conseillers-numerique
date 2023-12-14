#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import execute from '../utils';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';

// ts-node src/tools/scripts/fix-quotas-validation-coselec.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const structures = await app.service(service.structures).Model.find({
      statut: 'VALIDATION_COSELEC',
    });

    const structuresATraiter = [];

    for (const structure of structures) {
      const demandeEnCours = structure.demandesCoselec?.filter(demande => demande.statut === 'en_cours');
      if (demandeEnCours?.length === 1) {
        logger.info(
          `La structure ${structure.idPG} a une demande coselec en cours`,
        );
        structuresATraiter.push(structure);
      }
    }

    logger.info(`Nombre de structures à traiter: ${structuresATraiter?.length}`);
    for (const structure of structuresATraiter) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await app.service(service.structures).Model.updateOne(
          { _id: structure._id },
          {
            $set: {
              'demandesCoselec.0.nbPostesAvantDemande': getCoselec(structure)?.nombreConseillersCoselec,
            },
          },
        );
        logger.info(
          `La structure ${structure.idPG} a été mise à jour`,
        );
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
