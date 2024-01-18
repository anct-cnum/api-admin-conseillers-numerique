#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import execute from '../utils';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';

// ts-node src/tools/scripts/detect-structure-anomalie-coselec.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const structuresATraiter = await app
      .service(service.structures)
      .Model.find({
        statut: { $nin: ['CREEE', 'VALIDATION_COSELEC'] },
      });
    logger.info(`Nombre de structures à traiter: ${structuresATraiter.length}`);
    const csvFilePath = path.join(
      __dirname,
      `../../../datas/exports/structures-anomalie_coselec-${Date.now()}.csv`,
    );
    let csvBuild =
      'ID structure; Nom de la Structure;Statut;Anomalie;Contrat(s) Finalisé(s); Contrat(s) en rupture; CDI; Autres\n';
    let countOk = 0;
    for (const structure of structuresATraiter) {
      try {
        const coselec = getCoselec(structure);
        const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;

        // eslint-disable-next-line no-await-in-loop
        const misesEnRelation = await app
          .service(service.misesEnRelation)
          .Model.find({
            'structure.$id': structure._id,
            statut: { $in: ['finalisee', 'nouvelle_rupture'] },
          });

        if (
          (misesEnRelation.length === 0 && nombreConseillersCoselec === 0) ||
          coselec?.avisCoselec !== 'POSITIF'
        ) {
          countOk += 1;
        } else {
          const anomalie = `${nombreConseillersCoselec} Poste(s) / ${misesEnRelation.length} contrat(s)`;
          const misesEnRelationFinalisee = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation?.statut === 'finalisee',
          ).length;
          const misesEnRelationNouvelleRupture = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation?.statut === 'nouvelle_rupture',
          ).length;
          const nombreCDI = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation?.typeDeContrat === 'CDI',
          ).length;
          const autres = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation?.typeDeContrat !== 'CDI',
          ).length;
          csvBuild += `${structure.idPG};${structure.nom};${structure.statut};${anomalie};${misesEnRelationFinalisee};${misesEnRelationNouvelleRupture};${nombreCDI};${autres}\n`;
        }
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la structure ${structure.idPG}: ${error}`,
        );
      }
    }
    fs.writeFileSync(csvFilePath, csvBuild);
    logger.info(
      `Nombre de structures traiter: ${
        structuresATraiter.length - countOk
      } anomalie(s)/ ${structuresATraiter.length}`,
    );
    logger.info(`Fichier CSV généré à l'emplacement: ${csvFilePath}`);
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
