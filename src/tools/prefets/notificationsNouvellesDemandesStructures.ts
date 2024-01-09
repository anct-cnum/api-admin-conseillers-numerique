#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/prefets/notificationsNouvellesDemandesCoordinateurs.ts

import execute from '../utils';
import service from '../../helpers/services';
import { informationNouvelleCandidatureStructure } from '../../emails';
import { IStructures } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, mailer, logger, exit }) => {
  const dateMoins1Jours = new Date();
  dateMoins1Jours.setDate(dateMoins1Jours.getDate() - 1);
  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find(
      {
        statut: 'CREEE',
        coordinateurCandidature: false,
        createdAt: {
          $gte: dateMoins1Jours,
          $lte: new Date(),
        },
        codeDepartement: { $ne: '00' },
      },
      {
        codeDepartement: 1,
        nom: 1,
      },
    );
  if (structures.length === 0) {
    exit();
    return;
  }
  const departements = [
    ...new Set(structures.map((structure) => structure.codeDepartement)),
  ];
  const prefets = await app.service(service.users).Model.find(
    {
      departement: { $in: departements },
    },
    {
      _id: 0,
      name: 1,
      departement: 1,
    },
  );
  const prefetsWithStructure = structures.flatMap((structure) =>
    prefets
      .filter((prefet) => prefet.departement === structure.codeDepartement)
      .map((prefet) => ({ ...prefet._doc, structure })),
  );
  const messageAvisCandidaturePosteStructure =
    informationNouvelleCandidatureStructure(app, mailer);
  const promises: Promise<void>[] = [];
  let count = 0;
  prefetsWithStructure.forEach(async (prefetWithStructure) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const errorSmtpMailCandidaturePosteStructure =
        await messageAvisCandidaturePosteStructure
          .send(prefetWithStructure)
          .catch((errSmtp: Error) => {
            return errSmtp;
          });
      if (errorSmtpMailCandidaturePosteStructure instanceof Error) {
        reject();
        return;
      }
      count += 1;
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  logger.info(
    `Nombre de mails envoyés pour les notifications de candidature structure : ${count}`,
  );
  exit();
});
