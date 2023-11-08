#!/usr/bin/env node

// ts-node src/tools/structures/traitement-doublon.ts -s XXX

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

program.option('-id, --idPG <idPG>', 'idPG de la structure');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  if (Number.isNaN(options.idPG)) {
    logger.error(`Veuillez renseigner un idPG valide.`);
    return;
  }
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateOne(
      {
        idPG: options.idPG,
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
