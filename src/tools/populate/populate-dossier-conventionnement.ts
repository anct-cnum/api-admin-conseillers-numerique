#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-dossier-conventionnement.ts

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { queryGetDossierReconventionnement } from '../../services/structures/repository/reconventionnement.repository';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  // eslint-disable-next-line new-cap
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes ID
  return structures;
};

execute(__filename, async ({ app, logger, exit, graphQLClient }) => {
  const options = program.opts();
  const structures = await readCSV(options.csv);
  const promises: Promise<void>[] = [];
  structures.forEach(async (structure) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      try {
        const dossier: any | Error = await graphQLClient
          .request(queryGetDossierReconventionnement, {
            dossierNumber: parseInt(structure.NUMERO, 10),
          })
          .catch(() => {
            return new Error("Le dossier n'existe pas");
          });
        if (dossier instanceof Error) {
          logger.warn(`Structure [${structure.ID}], ${dossier.message}`);
          reject();
        } else {
          const structureUpdated = await app
            .service(service.structures)
            .Model.updateOne(
              {
                idPG: parseInt(structure.ID, 10),
                'conventionnement.dossierConventionnement': { $exists: false },
              },
              {
                'conventionnement.statut': 'CONVENTIONNEMENT_VALIDÉ',
                'conventionnement.dossierConventionnement': {
                  statut: dossier.dossier.state,
                  numero: dossier.dossier.number,
                  dateDeCreation: new Date(
                    dossier.dossier.datePassageEnConstruction,
                  ),
                  dateDerniereModification: new Date(
                    dossier.dossier.dateDerniereModification,
                  ),
                  dateDeValidation: dossier.dossier.dateTraitement
                    ? new Date(dossier.dossier.dateTraitement)
                    : null,
                },
              },
            );
          if (structureUpdated.modifiedCount === 1) {
            logger.info(`Structure [${structure.ID}] mise à jour avec succès`);
          }
          resolve(p);
        }
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit(0, 'Migration terminée');
});
