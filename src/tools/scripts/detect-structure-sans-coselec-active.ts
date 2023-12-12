#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import execute from '../utils';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';

// ts-node src/tools/scripts/detect-structure-sans-coselec-active.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const structures = await app.service(service.structures).Model.find({
      statut: 'VALIDATION_COSELEC',
    });

    const structuresATraiter = [];
    for (const structure of structures) {
      const coselec = getCoselec(structure);
      const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;
      if (nombreConseillersCoselec === 0) {
        logger.warn(
          `La structure ${structure.idPG} n'a pas de conseiller COSELEC`,
        );
        structuresATraiter.push(structure);
      }
    }

    if (structuresATraiter.length === 0) {
      logger.info('Aucune structure à traiter');
      return;
    }

    logger.info(`Nombre de structures à traiter: ${structuresATraiter.length}`);
    const csvFilePath = path.join(
      __dirname,
      `../../../datas/exports/structures-sans-poste_coselec-${Date.now()}.csv`,
    );
    let csvBuild =
      'ID structure; Nom de la Structure; Contrat(s) Finalisé(s); Contrat(s) en rupture; CDI; Autres\n';

    for (const structure of structuresATraiter) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const misesEnRelation = await app
          .service(service.misesEnRelation)
          .Model.find({
            'structure.$id': structure._id,
            statut: { $in: ['finalisee', 'nouvelle_rupture'] },
          });

        if (misesEnRelation.length > 0) {
          logger.warn(
            `La structure sans poste ${structure.idPG} a une mise en relation finalisée ou en notification de rupture`,
          );
        }

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
        csvBuild += `${structure.idPG};${structure.nom};${misesEnRelationFinalisee};${misesEnRelationNouvelleRupture};${nombreCDI};${autres}\n`;
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la structure ${structure.idPG}: ${error}`,
        );
      }
    }
    fs.writeFileSync(csvFilePath, csvBuild);
    logger.info(`Fichier CSV généré à l'emplacement: ${csvFilePath}`);
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
