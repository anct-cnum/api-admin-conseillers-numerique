#!/usr/bin/env node
import dayjs from 'dayjs';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

// ts-node src/tools/scripts/unset-subs-by-domain.ts -d @exemple.fr

program
  .option('-d, --domain <domain>', 'domains: @exemple1.fr')
  .option('--analyse', 'Analyse des emails sans modifications')
  .parse();

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  const options = program.opts();
  const convertDate = (date) => dayjs(date).format('DD/MM/YYYY');

  try {
    if (!options.domain) {
      logger.error('Veuillez saisir un domaine.');
      return;
    }

    const users = await app
      .service(service.users)
      .Model.find({
        name: { $regex: options.domain, $options: 'i' },
        sub: { $exists: true },
      })
      .select({ name: 1, sub: 1, lastLogin: 1 });

    logger.info(`Nombre d'utilisateurs: ${users.length}`);

    if (users.length === 0) {
      logger.info(
        `Aucun utilisateur trouvé avec un sub et ayant le domaine ${options.domain}`,
      );
      return;
    }
    users.map((user) =>
      logger.info(
        `- ${user.name} - sub : ${user.sub} - dernière connexion ${convertDate(user.lastLogin)}`,
      ),
    );
    if (options.analyse) {
      logger.info('Analyse terminée - Modification non effectuée');
      return;
    }

    logger.info('MODIFICATION EN COURS...');

    const resetSubs = users.map(async (user: IUser) => {
      try {
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            $unset: {
              sub: '',
            },
          },
        );
      } catch (error) {
        logger.error(`Erreur pour l'utilisateur (${user.name}):`, error);
        Sentry.captureException(error);
      }
    });

    await Promise.all(resetSubs);
    logger.info(`Total des utilisateurs traités: ${users.length}`);
  } catch (error) {
    logger.error('Erreur :', error);
    Sentry.captureException(error);
    exit(1);
  }
});
