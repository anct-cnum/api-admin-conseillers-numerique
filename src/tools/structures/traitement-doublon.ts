#!/usr/bin/env node

// ts-node src/tools/structures/traitement-doublon.ts -id XXX

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

program.option('-id, --idPG <idPG>', 'idPG de la structure');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  if (Number.isNaN(Number(options.idPG))) {
    logger.error(`Veuillez renseigner un idPG valide.`);
    return;
  }
  const structure: IStructures = await app
    .service(service.structures)
    .Model.findOne({
      idPG: options.idPG,
      statut: 'CREEE',
    });
  if (!structure) {
    logger.info(`Structure non trouvée.`);
    return;
  }
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateOne(
      {
        _id: structure._id,
      },
      {
        $set: {
          statut: 'DOUBLON',
        },
      },
    );
  if (structureUpdated.modifiedCount === 0) {
    logger.error(`La structure ${structure?._id} n'a pas été mise à jour.`);
    return;
  }
  logger.info(`La structure ${structure?._id} a été mise à jour.`);
  exit();
});
