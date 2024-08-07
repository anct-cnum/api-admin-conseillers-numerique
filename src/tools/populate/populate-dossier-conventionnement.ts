#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-dossier-conventionnement.ts -c <path file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';
import { queryGetDossierDemarcheSimplifiee } from '../../services/structures/repository/demarchesSimplifiees.repository';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes ID && NUMERO

  return structures;
};

execute(__filename, async ({ app, logger, exit, graphQLClient }) => {
  const options = program.opts();
  const structures = await readCSV(options.csv);
  for (const structure of structures) {
    // eslint-disable-next-line no-await-in-loop
    const dossier: any | Error = await graphQLClient
      .request(queryGetDossierDemarcheSimplifiee(), {
        dossierNumber: parseInt(structure.NUMERO, 10),
      })
      .catch(() => {
        return new Error("Le dossier n'existe pas");
      });
    // eslint-disable-next-line no-await-in-loop
    const match = await app
      .service(service.structures)
      .Model.findOne({ idPG: structure.ID });
    if (dossier instanceof Error || match === null) {
      logger.warn(`Structure [${structure.ID}], ${dossier.message}`);
    } else {
      // eslint-disable-next-line no-await-in-loop
      const structureUpdated = await app
        .service(service.structures)
        .Model.updateOne(
          {
            idPG: match.idPG,
            statut: 'VALIDATION_COSELEC',
          },
          {
            'conventionnement.statut':
              match?.conventionnement?.statut === undefined
                ? StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                : match.conventionnement.statut,
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
        // eslint-disable-next-line no-await-in-loop
        await app.service(service.misesEnRelation).Model.updateMany(
          {
            'structure.$id': match._id,
            'structureObj.statut': 'VALIDATION_COSELEC',
          },
          {
            'structureObj.conventionnement.statut':
              match?.conventionnement?.statut === undefined
                ? StatutConventionnement.CONVENTIONNEMENT_VALIDÉ
                : match.conventionnement.statut,
            'structureObj.conventionnement.dossierConventionnement': {
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
        logger.info(`Structure [${structure.ID}] mise à jour avec succès`);
      }
    }
  }
  exit(0, 'Migration terminée');
});
