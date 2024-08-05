#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-prefet.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { invitationActiveCompte } from '../../emails';

const { v4: uuidv4 } = require('uuid');
const regions = require('../../../datas/imports/code_region.json');
const departements = require('../../../datas/imports/departements-region.json');

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const prefets = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec colonnes Mail, Type & Code
  return prefets;
};

const matchRegion = (code: string) =>
  regions.some((region: { code: string; nom: string }) => region.code === code);

const matchDepartement = (code: string) =>
  departements.some(
    (departement: { num_dep: string; dep_name: string; region_name: string }) =>
      departement.num_dep === code,
  );

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
      const code = String(prefet.Code).padStart(2, '0');
      if (user === null) {
        const localite = {};
        if (prefet.Type === 'Département' && matchDepartement(code)) {
          Object.assign(localite, { departement: code });
        }
        if (prefet.Type === 'Région' && matchRegion(code)) {
          Object.assign(localite, { region: code });
        }
        if (Object.keys(localite).length === 0) {
          logger.warn(
            `La localité est incorrect pour le préfet ${prefet.Mail}`,
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
        if (prefet.Type === 'Région' && user.region !== code) {
          logger.warn(
            `Le préfet ${user.name} n'est pas associé a la région présent dans le fichier`,
          );
          reject();
          return;
        }
        if (prefet.Type === 'Département' && user.departement !== code) {
          logger.warn(
            `Le préfet ${user.name} n'est pas associé au département présent dans le fichier`,
          );
          reject();
          return;
        }
        if (!user.roles.includes('prefet')) {
          logger.warn(`Le compte ${user.name} n'est pas un compte préfet`);
          reject();
          return;
        }
        logger.info(`le compte ${user.name} existe déjà`);
        reject();
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
