#!/usr/bin/env node
/* eslint-disable prettier/prettier */

// Lancement de ce script : ts-node src/tools/populate/populate-prefet.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { invitationActiveCompte } from '../../emails';

const { v4: uuidv4 } = require('uuid');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  // eslint-disable-next-line new-cap
  const prefets = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes Mail, Type & Code
  return prefets;
};

execute(__filename, async ({ app, logger, mailer, exit }) => {
  const messageInvitation = invitationActiveCompte(app, mailer);
  const options = program.opts();
  const prefets = await readCSV(options.csv);
  const promises: Promise<void>[] = [];

  prefets.forEach(async (prefet) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const user: IUser = await app.service(service.users).Model.findOne({
        name: prefet.Mail.toLowerCase(),
      });
      if (user === null) {
        const localite = {};
        if (prefet.Type === 'Département') {
          Object.assign(localite, { departement: String(prefet.Code) });
        }
        if (prefet.Type === 'Région') {
          Object.assign(localite, { region: String(prefet.Code) });
        }
        if (Object.keys(localite).length === 0) {
          logger.warn(
            `Type de localité incorrect pour le préfet ${prefet.Mail}`,
          );
          reject();
        } else {
          const userInserted: IUser = await app.service(service.users).create({
            name: prefet.Mail.toLowerCase(),
            roles: ['prefet'],
            password: uuidv4(),
            token: uuidv4(),
            tokenCreatedAt: new Date(),
            mailSentDate: null,
            migrationDashboard: true,
            passwordCreated: false,
            ...localite,
          });
          await messageInvitation.send(userInserted);
          logger.info(`compte ${userInserted.name} créé avec succès`);
          resolve(p);
        }
      } else {
        logger.warn(`le compte ${user.name} existe déjà`);
        reject();
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
