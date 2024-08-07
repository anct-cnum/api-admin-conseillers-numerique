#!/usr/bin/env node
import execute from '../utils';
import service from '../../helpers/services';

const { v4: uuidv4 } = require('uuid');

// ts-node src/tools/scripts/migration-role-coordinateur.ts

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const users = await app.service(service.users).Model.find({
      roles: { $in: ['coordinateur_coop'] },
    });

    logger.info(`Nombre d'utilisateurs à traiter: ${users?.length}`);

    for (const user of users) {
      if (user.passwordCreated === true) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await app.service(service.users).Model.updateOne(
            { _id: user._id },
            {
              $set: {
                roles: ['conseiller', 'coordinateur'],
                token: uuidv4(),
                tokenCreatedAt: new Date(),
                mailSentDate: null,
                migrationDashboard: true,
              },
            },
          );

          logger.info(`L'utilisateur ${user._id} a été mis à jour`);
        } catch (error) {
          logger.error(
            `Erreur lors du traitement de l'utilisateur ${user._id}: ${error}`,
          );
        }
      } else {
        logger.warn(`L'utilisateur ${user._id} est inactif`);
      }
    }

    logger.info('Fin du traitement');
    exit();
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
});
