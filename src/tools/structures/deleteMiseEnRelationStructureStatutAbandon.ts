#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/deleteMiseEnRelationStructureStatutAbandon.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, logger, exit }) => {
  const dateMoins2Jours = new Date();
  dateMoins2Jours.setDate(dateMoins2Jours.getDate() - 2);
  const structures = await app.service(service.structures).Model.find({
    statut: 'ABANDON',
    userCreated: false,
    updatedAt: {
      $gte: dateMoins2Jours,
      $lte: new Date(),
    },
  });
  if (structures.length === 0) {
    exit();
  }
  const promises: Promise<void>[] = [];
  structures.forEach(async (structure: IStructures) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        await app.service(service.misesEnRelation).Model.deleteMany({
          statut: { $in: ['nouvelle', 'nonInteressee', 'interessee'] },
          'structure.$id': structure._id,
        });
        resolve(p);
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
