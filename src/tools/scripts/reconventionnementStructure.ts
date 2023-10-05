#!/usr/bin/env node

// ts-node src/tools/scripts/reconventionnementStructure.ts -s XXX -st XXX

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';

program.option('-s, --structureId <structureId>', 'id structure');
program.option('-st, --statut <statut>', 'statut');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const valueConvention = Object.values(StatutConventionnement).filter((i) =>
    i.match(/RECONVENTIONNEMENT/g),
  );
  if (!ObjectId.isValid(options.structureId)) {
    logger.error(`Veuillez renseigner un id structure.`);
    return;
  }

  if (!valueConvention.includes(options.statut)) {
    logger.error(
      `Veuillez saisir un statut de reconventionnement, parmi la liste : ${valueConvention}`,
    );
    return;
  }
  const structureId = new ObjectId(options.structureId);

  const update = await app.service(service.structures).Model.updateOne(
    { _id: structureId },
    {
      $set: {
        'conventionnement.statut': options.statut,
      },
    },
  );
  if (update.modifiedCount === 1) {
    await app.service(service.misesEnRelation).Model.updateMany(
      { 'structure.$id': structureId },
      {
        $set: {
          'structureObj.conventionnement.statut': options.statut,
        },
      },
    );
    logger.info(
      `Modification effectuée pour la structure ${structureId} en statut ${options.statut}`,
    );
  } else {
    logger.info(`Structure non trouvée.`);
  }
  exit();
});
