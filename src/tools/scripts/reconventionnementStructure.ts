#!/usr/bin/env node

// ts-node src/tools/scripts/reconventionnementStructure.ts -s XXX -st XXX

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';

interface Options {
  structureId: ObjectId;
  statut: StatutConventionnement;
}

program.option('-s, --structureId <structureId>', 'id structure');
program.option('-st, --statut <statut>', 'statut');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const { statut, structureId }: Options = program.opts();
  const valueConvention = Object.values(StatutConventionnement).filter((i) =>
    i.match(/RECONVENTIONNEMENT/g),
  );
  if (!ObjectId.isValid(structureId)) {
    logger.error(`Veuillez renseigner un id structure.`);
    return;
  }

  if (!valueConvention.includes(statut)) {
    logger.error(
      `Veuillez saisir un statut de reconventionnement, parmi la liste : ${valueConvention}`,
    );
    return;
  }

  const update = await app.service(service.structures).Model.updateOne(
    { _id: structureId },
    {
      $set: {
        'conventionnement.statut': statut,
      },
    },
  );
  if (update.modifiedCount === 1) {
    await app.service(service.misesEnRelation).Model.updateMany(
      { 'structure.$id': structureId },
      {
        $set: {
          'structureObj.conventionnement.statut': statut,
        },
      },
    );
    logger.info(
      `Modification effectuée pour la structure ${structureId} en statut ${statut}`,
    );
  } else {
    logger.info(`Structure non trouvée.`);
  }
  exit();
});
