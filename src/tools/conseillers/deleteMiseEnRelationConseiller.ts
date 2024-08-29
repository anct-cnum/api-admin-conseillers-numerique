#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/conseillers/deleteMiseEnRelationConseiller.ts

import execute from '../utils';
import service from '../../helpers/services';

execute(__filename, async ({ app, logger, exit }) => {
  const dateMoins2Jours = new Date();
  dateMoins2Jours.setDate(dateMoins2Jours.getDate() - 2);
  const conseillers = await app.service(service.conseillers).Model.find({
    disponible: false,
    statut: 'RECRUTE',
    updatedAt: {
      $gte: dateMoins2Jours,
      $lte: new Date(),
    },
  });
  if (conseillers.length === 0) {
    exit();
    return;
  }
  let countDeleteMiseEnRelation = 0;
  let countDeleteDoublonConseillers = 0;
  for (const conseiller of conseillers) {
    // eslint-disable-next-line no-await-in-loop
    const deleteMiseEnRelation = await app
      .service(service.misesEnRelation)
      .Model.deleteMany({
        'conseiller.$id': conseiller._id,
        statut: {
          $in: ['nouvelle', 'nonInteressee', 'interessee'],
        },
      });
    countDeleteMiseEnRelation += deleteMiseEnRelation.deletedCount;
    // eslint-disable-next-line no-await-in-loop
    const deleteDoublon = await app
      .service(service.misesEnRelation)
      .Model.deleteMany({
        'conseiller.$id': { $ne: conseiller._id },
        'conseillerObj.email': conseiller.email,
        statut: {
          $in: ['nouvelle', 'nonInteressee', 'interessee'],
        },
      });
    countDeleteDoublonConseillers += deleteDoublon.deletedCount;
  }
  logger.info(`mise en relation supprimées : ${countDeleteMiseEnRelation}`);
  logger.info(
    `doublons conseillers supprimés : ${countDeleteDoublonConseillers}`,
  );
  exit();
});
