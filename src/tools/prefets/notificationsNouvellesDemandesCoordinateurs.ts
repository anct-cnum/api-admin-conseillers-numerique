#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/prefets/notificationsNouvellesDemandesCoordinateurs.ts

import execute from '../utils';
import service from '../../helpers/services';
import { informationNouvelleCandidatureCoordinateur } from '../../emails';

execute(__filename, async ({ app, mailer, logger, exit }) => {
  const structures = await app.service(service.structures).Model.find(
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
      demandesCoordinateur: 1,
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
  const demandesCoordinateurs = structures.flatMap((structure) => {
    const structureFormat = structure;
    // la requête renvoie toute les demandes coordinateurs de la structure sans prendre en compte le filtre statut
    // dans l'aggregate on ne peut pas récupérer seulement l'élément du tableau qui match avec le filtre
    structureFormat.demandesCoordinateur =
      structure.demandesCoordinateur.filter(
        (demande) =>
          demande.statut === 'en_cours' &&
          !demande?.avisPrefet &&
          !demande?.mailSendDatePrefet,
      );
    return structureFormat.demandesCoordinateur.map((demande) => {
      const item: any = demande.toObject();
      item.idStructure = structure._id;
      item.codeDepartementStructure = structure.codeDepartement;

      return item;
    });
  });
  const demandesCoordinateursWithPrefets = demandesCoordinateurs.map(
    (demandeCoordinateur) => {
      const prefet = prefets.find(
        (pref) =>
          pref.departement === demandeCoordinateur.codeDepartementStructure,
      );
      return {
        ...prefet._doc,
        demandeCoordinateur,
      };
    },
  );
  const messageAvisCandidaturePosteCoordinateur =
    informationNouvelleCandidatureCoordinateur(app, mailer);
  const promises: Promise<void>[] = [];
  let count = 0;
  demandesCoordinateursWithPrefets.forEach(
    async (demandeCoordinateurWithPrefet) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve, reject) => {
        const errorSmtpMailCandidaturePosteCoordinateur =
          await messageAvisCandidaturePosteCoordinateur
            .send(demandeCoordinateurWithPrefet)
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
    },
  );
  await Promise.allSettled(promises);
  logger.info(
    `Nombre de mails envoyés pour les notifications de candidature coordinateur : ${count}`,
  );
  exit();
});
