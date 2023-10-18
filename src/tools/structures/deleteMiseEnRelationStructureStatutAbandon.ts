#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/deleteMiseEnRelationStructureStatutAbandon.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IMisesEnRelation } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, logger, exit }) => {
  const misesEnRelation: IMisesEnRelation[] = await app
    .service(service.misesEnRelation)
    .Model.aggregate([
      {
        $match: {
          statut: { $in: ['nouvelle', 'nonInteressee', 'interessee'] },
        },
      },
      {
        $lookup: {
          from: 'structures',
          let: {
            idStructure: '$structureObj._id',
          },
          as: 'structure',
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ['$$idStructure', '$_id'] } },
                  { $expr: { $eq: ['ABANDON', '$statut'] } },
                  { $expr: { $eq: [false, '$userCreated'] } },
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$structure' },
      {
        $project: {
          _id: 1,
        },
      },
    ]);

  if (misesEnRelation.length === 0) {
    exit();
  }
  const promises: Promise<void>[] = [];
  misesEnRelation.forEach(async (miseEnRelation: IMisesEnRelation) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        await app.service(service.misesEnRelation).Model.deleteOne({
          _id: miseEnRelation._id,
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
