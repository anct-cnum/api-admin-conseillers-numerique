#!/usr/bin/env node
import path from 'path';
import CSVToJSON from 'csvtojson';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

// ts-node src/tools/scripts/migration-sub-inclusion-connect-vers-agent-connect.ts
execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const csvFile = path.join(
      __dirname,
      '../../../datas/imports',
      'mapping_agentconnect_ic_mcp_import_result_PRODUCTION_20241028.csv',
    );
    const mappingCsv = await CSVToJSON({ delimiter: 'auto' }).fromFile(csvFile);
    const SUB_MAPPING = mappingCsv.reduce((acc, record) => {
      acc[record['Sub InclusionConnect']] = record['Sub AgentConnect'];
      return acc;
    }, {});
    const users = await app.service(service.users).Model.find({
      sub: {
        $in: Object.keys(SUB_MAPPING) as string[],
      },
    });
    logger.info(`Nombre d'utilisateurs à traiter: ${users?.length}`);
    const updatePromises = users.map(async (user: IUser) => {
      let newSub: string;
      try {
        newSub = SUB_MAPPING[user.sub];
        if (!newSub) {
          logger.warn(`L'utilisateur ${user._id} n'a pas de nouveau sub`);
          return;
        }
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            $set: {
              sub: newSub,
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
