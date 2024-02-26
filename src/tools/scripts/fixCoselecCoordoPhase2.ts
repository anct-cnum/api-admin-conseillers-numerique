#!/usr/bin/env node

// ts-node src/tools/scripts/fixCoselecCoordoPhase2.ts

import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';

execute(__filename, async ({ app, logger, exit }) => {
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateMany(
      {
        'conventionnement.statut': {
          $ne: StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
        },
        'coselec.type': 'coordinateur',
        'coselec.phaseConventionnement': '2',
      },
      {
        $unset: {
          'coselec.$.phaseConventionnement': '', // A revoir car il unset que le 1er trouver
        },
      },
    );

  logger.info(
    `${structureUpdated.modifiedCount} structure(s) a été mise à jour.`,
  );
  exit();
});
