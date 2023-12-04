#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import execute from '../utils';

// ts-node src/tools/scripts/detect-structure-sans-coselec-active.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const structures = await app.service('structures').Model.find({
      $expr: {
        $eq: [{ $arrayElemAt: ['$coselec.nombreConseillersCoselec', -1] }, 0],
      },
      statut: { $ne: 'ABANDON' },
    });

    if (structures.length === 0) {
      logger.info('Aucune structure à traiter');
      return;
    }

    logger.info(`Nombre de structures à traiter: ${structures.length}`);
    const csvFilePath = path.join(
      __dirname,
      `../../../datas/exports/structures-sans-coselec-${Date.now()}.csv`,
    );
    let csvBuild =
      'ID; Nom de la Structure; Contrat(s) Finalisé(s); Contrat(s) en rupture; CDI; CDD\n';
    const promises = [];

    for (const structure of structures) {
      const promise = app
        .service('misesEnRelation')
        .Model.find({
          'structure.$id': structure._id,
          statut: { $in: ['finalisee', 'nouvelle_rupture'] },
        })
        .then((misesEnRelation) => {
          if (misesEnRelation) {
            logger.warn(
              `La structure ${structure.idPG} a une mise en relation finalisée ou en rupture, nous ne déclarons pas la structure comme inactive`,
            );
          }
          const misesEnRelationFinalisee = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation.statut === 'finalisee',
          ).length;
          const misesEnRelationNouvelleRupture = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation.statut === 'nouvelle_rupture',
          ).length;
          const nombreCDI = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation.typeDeContrat === 'CDI',
          ).length;
          const nombreCDD = misesEnRelation.filter(
            (miseEnRelation) => miseEnRelation.typeDeContrat === 'CDD',
          ).length;
          return `${structure.idPG}; ${structure.nom}; ${misesEnRelationFinalisee}; ${misesEnRelationNouvelleRupture}; ${nombreCDI}; ${nombreCDD}\n`;
        });

      promises.push(promise);
    }

    const results = await Promise.all(promises);
    csvBuild += results.join('');
    fs.writeFileSync(csvFilePath, csvBuild);
    logger.info(`Fichier CSV généré à l'emplacement: ${csvFilePath}`);
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
