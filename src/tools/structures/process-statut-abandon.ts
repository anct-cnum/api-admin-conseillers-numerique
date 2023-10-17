#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/process-statut-abandon.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, logger, exit }) => {
  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.aggregate([
      {
        $match: {
          statut: 'ABANDON',
          userCreated: false,
        },
      },
      {
        $lookup: {
          from: 'misesEnRelation',
          let: {
            idStructure: '$_id',
          },
          as: 'misesEnRelation',
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: {
                      $eq: ['$$idStructure', '$structureObj._id'],
                    },
                  },
                  {
                    $expr: {
                      $ne: ['terminee', '$statut'],
                    },
                  },
                  {
                    $expr: {
                      $ne: ['finalisee_rupture', '$statut'],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  if (structures.length === 0) {
    exit();
  }
  const promises: Promise<void>[] = [];
  structures.forEach(async (structure: IStructures) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        await app.service(service.misesEnRelation).Model.deleteMany({
          'structure.$id': structure._id,
          statut: { $nin: ['finalisee_rupture', 'terminee'] },
        });
        await app.service(service.users).Model.deleteMany({
          'entity.$id': structure._id,
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
