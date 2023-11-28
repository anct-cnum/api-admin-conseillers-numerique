#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/scripts/fix-statut-reconventionnement.ts

import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const structures = await app.service(service.structures).Model.find({
      statut: 'VALIDATION_COSELEC',
      'conventionnement.statut': 'RECONVENTIONNEMENT_EN_COURS',
    });
    let count = 0;
    let countError = 0;
    let countStructureWithoutDossierDS = 0;
    let countStructureWithDossierDS = 0;
    const promises: Promise<void>[] = [];
    await structures.forEach(async (structure) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        const objectConventionnement: any = {};
        const objectConventionnementMiseEnRelation: any = {};
        if (!structure.conventionnement?.dossierReconventionnement?.numero) {
          objectConventionnement.$set = {
            'conventionnement.statut':
              StatutConventionnement.RECONVENTIONNEMENT_INITIÉ,
            'conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          };
          objectConventionnementMiseEnRelation.$set = {
            'structureObj.conventionnement.statut':
              StatutConventionnement.RECONVENTIONNEMENT_INITIÉ,
            'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          };
          countStructureWithoutDossierDS += 1;
        } else {
          objectConventionnement.$set = {
            'conventionnement.statut':
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
            'conventionnement.dossierReconventionnement.banniereValidation':
              true,
            'conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          };
          objectConventionnementMiseEnRelation.$set = {
            'structureObj.conventionnement.statut':
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
            'structureObj.conventionnement.dossierReconventionnement.banniereValidation':
              true,
            'structureObj.conventionnement.dossierReconventionnement.dateDerniereModification':
              new Date(),
          };
          countStructureWithDossierDS += 1;
        }
        const structureUpdated = await app
          .service(service.structures)
          .Model.updateOne(
            {
              _id: structure._id,
            },
            objectConventionnement,
          );
        if (structureUpdated.modifiedCount === 1) {
          await app.service(service.misesEnRelation).Model.updateMany(
            {
              'structure.$id': structure._id,
            },
            objectConventionnementMiseEnRelation,
          );
          count += 1;
        } else {
          countError += 1;
        }
        resolve(p);
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    logger.info(`${count} structures mises à jour`);
    logger.info(`${countError} structures non mises à jour`);
    logger.info('-'.repeat(30));
    logger.info(
      `${countStructureWithoutDossierDS} structures sont repassées en RECONVENTIONNEMENT_INITIÉ`,
    );
    logger.info(
      `${countStructureWithDossierDS} structures sont passées en RECONVENTIONNEMENT_VALIDÉ`,
    );
  } catch (e) {
    logger.error(e);
  }
  exit(0, 'Migration terminée');
});
