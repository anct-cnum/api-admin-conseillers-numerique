#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/fin-de-contrats.ts

import execute from '../utils';
import service from '../../helpers/services';

execute(__filename, async ({ app, logger, exit }) => {
  const promises: Promise<void>[] = [];
  const structures = await app.service(service.structures).Model.find({
    statut: 'VALIDATION_COSELEC',
    'conventionnement.statut': {
      $in: [
        'NON_INTERESSÉ',
        'RECONVENTIONNEMENT_VALIDÉ',
        'RECONVENTIONNEMENT_REFUSÉ',
      ],
    },
  });
  await structures.forEach(async (structure) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      await app.service(service.misesEnRelation).Model.updateMany(
        {
          'structure.$id': structure._id,
          statut: 'finalisee',
          dateFinDeContrat: {
            $lte: new Date(),
          },
        },
        {
          $set: {
            statut: 'terminee',
            motifRupture: 'nonReconductionCDD',
          },
        },
      );
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  logger.info('Mises en relation terminées');
  exit();
});
