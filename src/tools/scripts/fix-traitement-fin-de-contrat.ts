#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/scripts/fix-traitement-fin-de-contrat.ts

import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement } from '../../ts/enum';

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const countMiseEnRelationUpdated = await app
      .service(service.misesEnRelation)
      .Model.updateMany(
        {
          phaseConventionnement: PhaseConventionnement.PHASE_2,
          reconventionnement: true,
          $or: [
            {
              $and: [
                { statut: 'finalisee' },
                { miseEnRelationConventionnement: { $exists: true } },
              ],
            },
            {
              statut: 'renouvellement_initiee',
            },
          ],
        },
        {
          $unset: {
            reconventionnement: '',
          },
        },
      );
    if (countMiseEnRelationUpdated.modifiedCount > 0) {
      logger.info(
        `Nombre de mises en relation mises à jour : ${countMiseEnRelationUpdated.modifiedCount}`,
      );
    } else {
      logger.info(`Aucune mise en relation à mettre à jour.`);
    }
  } catch (e) {
    logger.error(e);
  }
  exit(0, 'Migration terminée');
});
