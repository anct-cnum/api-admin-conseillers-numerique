#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/deploy/users-grandReseau.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

const { v4: uuidv4 } = require('uuid');

const GrandsReseaux = require('../../../datas/imports/grands-reseaux.json');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes EMAIL & NOM & PRENOM & RESEAU
  return users;
};

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const users = await readCSV(options.csv);
  const promises: Promise<void>[] = [];

  users.forEach(async (user) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      try {
        const userAlreadyPresent = await app
          .service(service.users)
          .Model.countDocuments({
            name: user.EMAIL.toLowerCase(),
          });

        if (
          !user.EMAIL ||
          !user.NOM ||
          !user.PRENOM ||
          GrandsReseaux.some(
            (reseau: { valeur: string }) => reseau.valeur === user.RESEAU,
          ) === false
        ) {
          logger.warn(
            `Informations manquantes ou erronées pour : ${JSON.stringify(
              user,
            )}`,
          );
          reject();
        } else if (userAlreadyPresent > 0) {
          await app.service(service.users).Model.updateOne(
            { name: user.EMAIL.toLowerCase() },
            {
              reseau: user.RESEAU,
              nom: user.NOM,
              prenom: user.PRENOM,
              token: uuidv4(),
              tokenCreatedAt: new Date(),
              mailSentDate: null,
              migrationDashboard: true,
              $push: {
                roles: 'grandReseau',
              },
            },
          );
          logger.info(
            `Email déjà présent : ${user.EMAIL.toLowerCase()} - Rôle grandReseau ajouté`,
          );
          resolve(p);
        } else {
          const userGR: IUser = await app.service(service.users).create({
            name: user.EMAIL.toLowerCase(),
            reseau: user.RESEAU,
            nom: user.NOM,
            prenom: user.PRENOM,
            roles: ['grandReseau'],
            password: uuidv4(),
            token: uuidv4(),
            tokenCreatedAt: new Date(),
            mailSentDate: null,
            passwordCreated: false,
            migrationDashboard: true,
          });
          logger.info(
            `Utilisateur ${userGR.name} créé et associé au réseau ${userGR.reseau}`,
          );
          resolve(p);
        }
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
