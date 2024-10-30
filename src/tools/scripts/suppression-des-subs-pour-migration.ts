#!/usr/bin/env node
import path from 'path';
import CSVToJSON from 'csvtojson';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

// ts-node src/tools/scripts/suppression-des-subs-pour-migration.ts
execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const csvFile = path.join(
      __dirname,
      '../../../datas/imports',
      'mapping_agentconnect_ic_mcp_import_result_PRODUCTION_20241028.csv',
    );
    const mappingCsv = await CSVToJSON({ delimiter: 'auto' }).fromFile(csvFile);
    const emailsToBlank = mappingCsv.map((record) => record.Email);
    const users = await app.service(service.users).Model.find({
      email: { $in: emailsToBlank },
    });
    logger.info(`Nombre d'utilisateurs à traiter: ${users?.length}`);
    const updatePromises = users.map(async (user: IUser) => {
      try {
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            $unset: {
              sub: '',
            },
          },
        );
        logger.info(`L'utilisateur ${user._id} a été mis à jour`);
      } catch (error) {
        logger.error(error);
        Sentry.captureException(error);
      }
    });

    await Promise.all(updatePromises);
    logger.info('Migration terminée');
    exit(0);
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
    exit(1);
  }
});
