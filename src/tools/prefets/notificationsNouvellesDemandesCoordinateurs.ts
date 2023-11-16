#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/deleteMiseEnRelationStructureStatutAbandon.ts

import execute from '../utils';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
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
            mailSendDate: { $exists: false },
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
  console.log(departements);
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
  console.log(prefets);
  const prefetsFormat = prefets.toObject();
  const structureWithPrefets = structures.map((structure) => {
    const structureFormat = structures.find(
      (structure) => structure.codeDepartement === prefet.departement,
    );
    return {
      ...prefet,
      structureFormat,
    };
  });
  console.log(structureWithPrefets);
  // const messageAvisCandidaturePosteCoordinateur =
  //   informationNouvelleCandidatureCoordinateur(app, mailer);
  // const promises: Promise<void>[] = [];
  // prefets.forEach(async (prefet: IPrefe) => {
  //   // eslint-disable-next-line no-async-promise-executor
  //   const p = new Promise<void>(async (resolve, reject) => {
  //     const errorSmtpMailCandidaturePosteCoordinateur =
  //       await messageAvisCandidaturePosteCoordinateur
  //         .send(prefet, structureUpdated)
  //         .catch((errSmtp: Error) => {
  //           return errSmtp;
  //         });
  //     if (errorSmtpMailCandidaturePosteCoordinateur instanceof Error) {
  //       reject();
  //       return;
  //     }
  //     resolve(p);
  //   });
  //   promises.push(p);
  // });
  // await Promise.allSettled(promises);
  // exit();
});
