#!/usr/bin/env node

// ts-node src/tools/scripts/fix-Date-fin-contrat-cdi.ts

import execute from '../utils';
import service from '../../helpers/services';

execute(__filename, async ({ app, logger, exit }) => {
  const updateMisesEnRelationTypeCdi = await app
    .service(service.misesEnRelation)
    .Model.updateMany(
      {
        typeDeContrat: 'CDI',
        dateFinDeContrat: { $exists: true },
      },
      {
        $unset: {
          dateFinDeContrat: '',
        },
      },
    );
  logger.info(
    `${updateMisesEnRelationTypeCdi.modifiedCount} misesEnRelations de type CDI ont eu la date de fin de contrat effacée`,
  );
  exit();
});
