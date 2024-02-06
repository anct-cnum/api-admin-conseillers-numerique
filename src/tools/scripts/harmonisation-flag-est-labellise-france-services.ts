#!/usr/bin/env node

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

// ts-node src/tools/scripts/harmonisation-flag-est-labellise-france-services.ts

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const structures: IStructures[] = await app
      .service(service.structures)
      .Model.find()
      .select({ estLabelliseFranceServices: 1 });

    const promises: Promise<void>[] = [];
    structures.forEach((structure: IStructures) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        if (
          ['NON', null, 'Non', 'DOUBLON', 'non'].includes(
            structure.estLabelliseFranceServices,
          )
        ) {
          await app.service(service.structures).Model.updateOne(
            {
              _id: structure._id,
            },
            {
              estLabelliseFranceServices: 'NON',
            },
          );
          await app.service(service.misesEnRelation).Model.updateMany(
            {
              'structure.$id': structure._id,
            },
            {
              'structureObj.estLabelliseFranceServices': 'NON',
            },
          );
        }
        if (
          ['Oui', 'OUI', 'oui'].includes(structure.estLabelliseFranceServices)
        ) {
          await app.service(service.structures).Model.updateOne(
            {
              _id: structure._id,
            },
            {
              estLabelliseFranceServices: 'OUI',
            },
          );
          await app.service(service.misesEnRelation).Model.updateMany(
            {
              'structure.$id': structure._id,
            },
            {
              'structureObj.estLabelliseFranceServices': 'OUI',
            },
          );
        }

        resolve(p);
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    exit();
  } catch (error) {
    logger.error(error);
  }
});
