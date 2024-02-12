#!/usr/bin/env node
/* eslint-disable prettier/prettier */

// Lancement de ce script : ts-node src/tools/populate/populate-avis-prefet.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  // eslint-disable-next-line new-cap
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes ID, COMMENTAIRE, ID_TRANSFERT & AVIS_PREFET
  return structures;
};

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const structures = await readCSV(options.csv);
  const promises: Promise<void>[] = [];

  structures.forEach(async (structure) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const match: IStructures = await app
        .service(service.structures)
        .Model.findOne({
          idPG: parseInt(structure.ID, 10),
          statut: { $in: ['CREEE', 'EXAMEN_COMPLEMENTAIRE_COSELEC'] },
        });

      if (match === null) {
        logger.warn(`Structure ${structure.ID} inexistante`);
        reject();
        return;
      }
      const prefet = {
        avisPrefet: structure.AVIS_PREFET === 'Oui' ? 'POSITIF' : 'NÉGATIF',
        commentaire: structure.COMMENTAIRE,
        insertedAt: new Date(),
        banniereValidationAvisPrefet: false,
      };
      if (structure?.ID_TRANSFERT) {
        const structureTransfert: IStructures = await app
          .service(service.structures)
          .Model.findOne({ idPG: parseInt(structure.ID_TRANSFERT, 10) });
        if (!structureTransfert) {
          logger.warn(
            `Structure ${structure.ID_TRANSFERT} inexistante pour le transfert`,
          );
          reject();
          return;
        }
        Object.assign(prefet, {
          idStructureTransfert: structureTransfert._id,
        });
      }
      await app.service(service.structures).Model.updateOne(
        { _id: match._id },
        {
          $push: {
            prefet,
          },
        },
      );
      await app.service(service.misesEnRelation).Model.updateMany(
        { 'structure.$id': match._id },
        {
          $push: {
            'structureObj.prefet': prefet,
          },
        },
      );
      logger.info(
        `Un avis préfet a été donné à la structure ${match.idPG}`,
      );
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
