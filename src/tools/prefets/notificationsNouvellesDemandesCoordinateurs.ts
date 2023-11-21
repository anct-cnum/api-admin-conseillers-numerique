#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/prefets/notificationsNouvellesDemandesCoordinateurs.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import { informationNouvelleCandidatureCoordinateur } from '../../emails';

execute(__filename, async ({ app, mailer, logger, exit }) => {
  const structures: IStructures[] = await app
    .service(service.structures)
    .Model.find(
      {
        demandesCoordinateur: {
          $elemMatch: {
            statut: { $eq: 'en_cours' },
            avisPrefet: { $exists: false },
            mailSendDatePrefet: { $exists: false },
          },
        },
      },
      {
        'demandesCoordinateur.$': 1,
        codeDepartement: 1,
      },
    );
  if (structures.length === 0) {
    exit();
    return;
  }
  const departements = structures.map((structure) => structure.codeDepartement);
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

  const structureWithPrefets = prefets.map((prefet) => {
    const structureFormat = structures.find(
      (structure) => structure.codeDepartement === prefet._doc.departement,
    );
    return {
      ...prefet._doc,
      structureFormat,
    };
  });
  const messageAvisCandidaturePosteCoordinateur =
    informationNouvelleCandidatureCoordinateur(app, mailer);
  const promises: Promise<void>[] = [];
  let count = 0;
  structureWithPrefets.forEach(async (structureWithPrefet) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const errorSmtpMailCandidaturePosteCoordinateur =
        await messageAvisCandidaturePosteCoordinateur
          .send(structureWithPrefet)
          .catch((errSmtp: Error) => {
            return errSmtp;
          });
      if (errorSmtpMailCandidaturePosteCoordinateur instanceof Error) {
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
    `Nombre de mails envoyés pour les notifications de candidature coordinateur : ${count}`,
  );
  exit();
});
