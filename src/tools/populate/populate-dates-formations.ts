#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-dates-formations.ts -c <path file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const conseillers = await CSVToJSON({
    delimiter: 'auto',
    trim: true,
  }).fromFile(filePath); // CSV en entrée

  return conseillers;
};

execute(__filename, async ({ app, logger, exit }) => {
  const matchConseiller = (idPGConseiller: number) =>
    app.service(service.conseillers).Model.findOne({
      idPG: idPGConseiller,
      statut: {
        $in: ['RECRUTE', 'RUPTURE'],
      },
    });

  const options = program.opts();
  const conseillers = await readCSV(options.csv);

  const promises: Promise<void>[] = [];

  let trouvees = 0;
  let inconnues = 0;

  conseillers.forEach(async (conseiller) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const idPGConseiller = parseInt(conseiller['Id conseiller'], 10);
      if (Number.isNaN(idPGConseiller)) {
        inconnues += 1;
        logger.error(
          `Id conseiller ${conseiller['Id conseiller']} est invalide`,
        );
        reject();
        return;
      }
      const match = await matchConseiller(idPGConseiller);

      if (match === null) {
        inconnues += 1;
        logger.warn(`Le conseiller ${idPGConseiller} est inexistant`);
        reject();
      } else {
        trouvees += 1;
        if (conseiller['Date de début formation'].trim().length === 0) {
          logger.error(
            `Date de début manquante pour le conseiller ${idPGConseiller}`,
          );
          reject();
        } else if (conseiller['Date de fin formation'].trim().length === 0) {
          logger.error(
            `Date de fin manquante pour le conseiller ${idPGConseiller}`,
          );
          reject();
        } else {
          const [jourDebut, moisDebut, anneeDebut] =
            conseiller['Date de début formation'].split('/');
          const dateDebutObject = new Date(
            anneeDebut,
            moisDebut - 1,
            jourDebut,
            0,
            0,
            0,
          );
          const [jourFin, moisFin, anneeFin] =
            conseiller['Date de fin formation'].split('/');
          const dateFinObject = new Date(
            anneeFin,
            moisFin - 1,
            jourFin,
            0,
            0,
            0,
          );
          if (
            new Date() < dateDebutObject ||
            dateDebutObject < new Date('2020-11-17')
          ) {
            logger.error(
              `Date de début ${conseiller['Date de début formation']} est incorrecte pour le Conseiller ${idPGConseiller}`,
            );
            reject();
          } else if (
            dateFinObject < new Date('2020-11-17') ||
            dateFinObject < dateDebutObject
          ) {
            logger.error(
              `Date de fin ${conseiller['Date de fin formation']} est incorrecte pour le Conseiller ${idPGConseiller}`,
            );
            reject();
          } else if (
            new Date(dateDebutObject).toString() !== 'Invalid Date' &&
            new Date(dateFinObject).toString() !== 'Invalid Date'
          ) {
            await app.service(service.conseillers).Model.updateOne(
              { _id: match._id },
              {
                $set: {
                  datePrisePoste: dateDebutObject,
                  dateFinFormation: dateFinObject,
                },
              },
            );
            logger.info(
              `Date de formation mis à jour pour le Conseiller ${idPGConseiller}`,
            );
          } else {
            logger.error(
              `Invalid Date de formation ${conseiller['Date de début formation']} -  ${conseiller['Date de fin formation']} pour le Conseiller ${idPGConseiller}`,
            );
            reject();
          }
        }
      }
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  logger.info(`${conseillers.length} conseillers`);
  logger.info(`${inconnues} inconnues`);
  logger.info(`${trouvees} trouvées`);

  exit(0, 'Import terminée');
});
