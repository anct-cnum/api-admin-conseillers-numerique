#!/usr/bin/env node

// Lancement de ce script : node_modules/.bin/ts-node src/tools/scripts/import-structures-reconventionnement.ts -c file

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { StatutConventionnement } from '../../ts/enum';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const structures = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath);
  return structures;
};

execute(__filename, async ({ app, logger, exit }) => {
  const matchStructure = (id: number) =>
    app.service(service.structures).Model.findOne({ idPG: id });

  const options = program.opts();
  const structures = await readCSV(options.csv);
  let successCount: number = 0;

  const p = structures.map(async (structure) => {
    try {
      const match = await matchStructure(parseInt(structure['ID SA'], 10));
      if (match === null) {
        logger.error(`Structure ${structure['ID SA']} inexistante`);
        return;
      }
      if (match.statut !== 'VALIDATION_COSELEC') {
        logger.error(
          `Structure ${structure['ID SA']} n'est pas en VALIDATION_COSELEC (actuel: ${match.statut})`,
        );
        return;
      }
      if (
        [
          StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
          StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
        ].includes(match.conventionnement?.statut)
      ) {
        logger.error(
          `La structure ${structure['ID SA']} est déjà en ${match.conventionnement?.statut}`,
        );
        return;
      }
      const s = await app.service(service.structures).Model.findOneAndUpdate(
        { _id: match._id },
        {
          $set: {
            'conventionnement.statut':
              StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
          },
        },
        { returnOriginal: false },
      );
      if (s) {
        logger.info(
          `Structure ${structure['ID SA']} mise à jour avec succès en ${StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ} ( avant: ${match.conventionnement?.statut})`,
        );
      }
      const numeroDossier1 = String(
        s.conventionnement?.dossierConventionnement?.numero,
      );
      const numeroDossier2 = String(
        s.conventionnement?.dossierReconventionnement?.numero,
      );
      const isDS1Iso = structure['DS 1'] === numeroDossier1;
      const isDS2Iso = structure['DS V2'] === numeroDossier2;

      if (!isDS1Iso) {
        logger.warn(
          `DS1: ${structure['DS 1']} n'est pas iso avec ${numeroDossier1} pour la structure ${s.nom} - ${s.idPG}`,
        );
      }
      if (!isDS2Iso) {
        logger.warn(
          `DS2: ${structure['DS V2']} n'est pas iso avec ${numeroDossier2} pour la structure ${s.nom} - ${s.idPG}`,
        );
      }
      const updatemisesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.updateMany(
          {
            'structure.$id': s._id,
            statut: 'finalisee',
            reconventionnement: null,
            phaseConventionnement: null,
          },
          {
            $set: {
              reconventionnement: true,
            },
          },
        );
      logger.info(
        `update ${updatemisesEnRelation.modifiedCount} misesEnRelation pour la structure ${s.nom} - ${s.idPG}`,
      );
      successCount += 1;
    } catch (error) {
      logger.error(
        `Erreur lors du traitement de la structure ${structure['ID SA']}:`,
        error,
      );
    }
  });
  await Promise.allSettled(p);
  logger.info(
    `Import terminé avec succès pour ${successCount} structures sur ${structures.length}`,
  );
  exit();
});
