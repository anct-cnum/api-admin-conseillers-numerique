#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/prefets/notificationsNouvellesDemandesConseillers.ts

import execute from '../utils';
import service from '../../helpers/services';
import { informationNouvelleCandidatureConseiller } from '../../emails';
import { IStructures } from '../../ts/interfaces/db.interfaces';

execute(__filename, async ({ app, mailer, logger, exit, delay }) => {
  const dateMoins1Jours = new Date();
  dateMoins1Jours.setDate(dateMoins1Jours.getDate() - 1);
  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find(
      {
        statut: 'CREEE',
        coordinateurCandidature: false,
        createdAt: { $gte: dateMoins1Jours },
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
  const messageAvisCandidaturePosteConseiller =
    informationNouvelleCandidatureConseiller(app, mailer);
  let count = 0;
  for (const prefetWithStructure of prefetsWithStructure) {
    const errorSmtpMailCandidaturePosteConseiller =
      await messageAvisCandidaturePosteConseiller
        .send(prefetWithStructure)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
    if (errorSmtpMailCandidaturePosteConseiller instanceof Error) {
      logger.error(
        `Erreur lors de l'envoi du mail de notification de candidature conseiller : ${errorSmtpMailCandidaturePosteConseiller}`,
      );
    } else {
      count += 1;
    }
    await delay(2000);
  }
  logger.info(
    `Nombre de mails envoyés pour les notifications de candidature conseiller : ${count}`,
  );
  exit();
});
