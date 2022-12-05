#!/usr/bin/env node
/* eslint-disable prettier/prettier */

// Lancement de ce script : ts-node src/tools/deploy/users-grandReseau.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

const { v4: uuidv4 } = require('uuid');

const  GrandsReseaux = require('../../../datas/imports/grands-reseaux.json');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  // eslint-disable-next-line new-cap
  const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes EMAIL & NOM & PRENOM & RESEAU
  return users;
};

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const users = await readCSV(options.csv);
  const promises = [];

  users.forEach(async (user) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise(async (resolve, reject) => {

      if (!user.EMAIL || !user.NOM || !user.PRENOM || GrandsReseaux.some((reseau: { valeur: string; }) => reseau.valeur === user.RESEAU) === false) {
        logger.warn(`Informations manquantes ou erronées pour : ${JSON.stringify(user)}`);
        reject();
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
        });
        logger.info(`Utilisateur ${userGR.name} créé et associé au réseau ${userGR.reseau}`);
        resolve(p);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
