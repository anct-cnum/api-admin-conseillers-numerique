#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/scripts/delete-account-user.ts -c <file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

program.option('-c, --csv <path>', 'CSV file path');
program.option('-r, --role <role>', 'role');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const users = await CSVToJSON({ delimiter: 'auto' }).fromFile(filePath); // CSV en entrée avec la colonne Mail
  return users;
};

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const allowedRoles = ['admin', 'grandReseau', 'prefet'];
  if (!allowedRoles.includes(options.role)) {
    logger.error('Le role doit être admin, grandReseau ou prefet');
    exit();
  }
  const users = await readCSV(options.csv);
  const promises: Promise<void>[] = [];

  users.forEach(async (userCsv) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const user: IUser = await app.service(service.users).Model.findOne({
        name: userCsv.Mail.toLowerCase(),
        roles: { $in: [options.role] },
      });
      if (user !== null) {
        await app.service(service.users).Model.deleteOne({
          _id: user._id,
        });
        logger.info(`Le compte ${user.name} a été supprimé`);
        resolve(p);
      } else {
        logger.warn(`le compte ${userCsv.Mail.toLowerCase()} n'existe pas`);
        reject();
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
