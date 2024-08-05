#!/usr/bin/env node
// Lancement de ce script : ts-node src/tools/scripts/rattrapage-dossier-ds-grand-reseau.ts --csv <path>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import {
  getTypeDossierDemarcheSimplifiee,
  queryGetDossierDemarcheSimplifiee,
} from '../../services/structures/repository/demarchesSimplifiees.repository';
import { ITypeDossierDS } from '../../ts/interfaces/json.interface';
import { StatutConventionnement } from '../../ts/enum';

interface IDossierReconventionnement {
  numero: number;
  dateDeCreation: Date;
  statut: string;
  dateDerniereModification: Date;
  nbPostesAttribuees?: number;
  dateFinProchainContrat?: Date;
}

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec la colonne ID & DS2
  return structures;
};

execute(
  __filename,
  async ({ app, logger, graphQLClient, demarcheSimplifiee, exit }) => {
    const options = program.opts();
    const structures = await readCSV(options.csv);
    const promises: Promise<void>[] = [];
    try {
      structures.forEach(async (structureCsv) => {
        // eslint-disable-next-line no-async-promise-executor
        const p = new Promise<void>(async (resolve, reject) => {
          const dossier: any | Error = await graphQLClient
            .request(queryGetDossierDemarcheSimplifiee(), {
              dossierNumber: parseInt(structureCsv.DS2, 10),
            })
            .catch(() => {
              return new Error("Le dossier n'existe pas");
            });
          if (dossier instanceof Error) {
            logger.error(dossier.message);
            reject();
            return;
          }
          const structure: IStructures = await app
            .service(service.structures)
            .Model.findOne({
              idPG: parseInt(structureCsv.ID, 10),
              statut: 'VALIDATION_COSELEC',
            });
          if (!structure) {
            logger.error(`La structure ${structureCsv.ID} n'existe pas`);
            reject();
            return;
          }
          const typeDossierDS: ITypeDossierDS | undefined =
            getTypeDossierDemarcheSimplifiee(
              structure?.insee?.unite_legale?.forme_juridique?.libelle,
              demarcheSimplifiee,
            );
          if (!typeDossierDS) {
            logger.error(
              `La structure ${structure.idPG} a un type de dossier DS inconnu`,
            );
            reject();
            return;
          }
          const {
            champs,
            state,
            datePassageEnConstruction,
            dateDerniereModification,
          } = dossier.dossier;
          const dossierReconventionnement: IDossierReconventionnement = {
            numero: parseInt(structureCsv.DS2, 10),
            dateDeCreation: new Date(datePassageEnConstruction),
            statut: state,
            dateDerniereModification: new Date(dateDerniereModification),
          };
          switch (typeDossierDS.type) {
            case 'entreprise':
              dossierReconventionnement.nbPostesAttribuees = parseInt(
                champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1Mg==')
                  ?.integerNumber,
                10,
              );
              if (dossierReconventionnement.nbPostesAttribuees > 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjkzOTk4OA==',
                  )?.date,
                );
              }
              if (dossierReconventionnement.nbPostesAttribuees === 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjg4MzI1OA==',
                  )?.date,
                );
              }
              break;
            case 'structure_publique':
              dossierReconventionnement.nbPostesAttribuees = parseInt(
                champs.find((champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyMw==')
                  ?.integerNumber,
                10,
              );
              if (dossierReconventionnement.nbPostesAttribuees > 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNg==',
                  )?.date,
                );
              }
              if (dossierReconventionnement.nbPostesAttribuees === 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjkwMjkyNg==',
                  )?.date,
                );
              }
              break;
            case 'association':
              dossierReconventionnement.nbPostesAttribuees = parseInt(
                champs.find((champ: any) => champ.id === 'Q2hhbXAtMjg3MzQ4Mw==')
                  ?.integerNumber,
                10,
              );
              if (dossierReconventionnement.nbPostesAttribuees > 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjk0MDAwNA==',
                  )?.date,
                );
              }
              if (dossierReconventionnement.nbPostesAttribuees === 1) {
                dossierReconventionnement.dateFinProchainContrat = new Date(
                  champs.find(
                    (champ: any) => champ.id === 'Q2hhbXAtMjg3NDM2Mw==',
                  )?.date,
                );
              }
              break;
            default:
              logger.error(
                `La structure ${structure.idPG} a un type de dossier DS inconnu`,
              );
              reject();
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
                  'conventionnement.dossierReconventionnement':
                    dossierReconventionnement,
                  'conventionnement.statut':
                    structure?.conventionnement?.statut ===
                    StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                      ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                      : structure?.conventionnement?.statut,
                },
              },
            );
          if (structureUpdated.modifiedCount === 1) {
            await app.service(service.misesEnRelation).Model.updateMany(
              {
                'structure.$id': structure._id,
              },
              {
                $set: {
                  'structureObj.conventionnement.dossierReconventionnement':
                    dossierReconventionnement,
                  'structureObj.conventionnement.statut':
                    structure?.conventionnement?.statut ===
                    StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                      ? StatutConventionnement.RECONVENTIONNEMENT_INITIÉ
                      : structure?.conventionnement?.statut,
                },
              },
            );
          }
          resolve();
        });
        promises.push(p);
      });
    } catch (e) {
      logger.error(e);
    }
    const promisesExecuted = await Promise.allSettled(promises);
    const countError = promisesExecuted.filter(
      (p) => p.status === 'rejected',
    ).length;
    const countSuccess = promisesExecuted.filter(
      (p) => p.status === 'fulfilled',
    ).length;
    logger.info(`${countSuccess} structures mises à jour`);
    logger.error(`${countError} structures n'ont pas été mises à jour`);
    exit(0, 'Migration terminée');
  },
);
