#!/usr/bin/env node

// ts-node src/tools/structures/traitement-doublon.ts -s XXX

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';

program.option('-s, --structureId <structureId>', 'id structure');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  if (!ObjectId.isValid(options.structureId)) {
    logger.error(`Veuillez renseigner un id structure.`);
    return;
  }
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateOne(
      {
        _id: new ObjectId(options.structureId),
        statut: 'CREEE',
      },
      {
        $set: {
          statut: 'DOUBLON',
        },
      },
    );
  if (structureUpdated.modifiedCount === 0) {
    logger.error(`La structure n'a pas été mise à jour.`);
    return;
  }
  logger.info(`La structure a été mise à jour.`);
  exit();
});
