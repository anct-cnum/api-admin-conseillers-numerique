#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-grandReseau.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

const GrandsReseaux = require('../../../datas/imports/grands-reseaux.json');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes ID & RESEAU
  return structures;
};

execute(__filename, async ({ app, logger, exit }) => {
  const matchStructure = (id: number) =>
    app.service(service.structures).Model.findOne({ idPG: id });

  const options = program.opts();
  const structures = await readCSV(options.csv);
  const promises: Promise<void>[] = [];

  structures.forEach(async (structure) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const match = await matchStructure(parseInt(structure.ID, 10));

      if (match === null) {
        logger.warn(`Structure ${structure.ID} inexistante`);
        reject();
      } else if (
        GrandsReseaux.some(
          (reseau: { valeur: string }) => reseau.valeur === structure.RESEAU,
        ) === false
      ) {
        logger.warn(`Réseau incorrect pour la structure ${structure.ID}`);
        reject();
      } else {
        const s = await app
          .service(service.structures)
          .Model.findOneAndUpdate(
            { _id: match._id },
            { $set: { reseau: structure.RESEAU } },
            { returnOriginal: false },
          );
        logger.info(`Structure ${s.nom} associé au réseau ${s.reseau}`);
        resolve(p);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
