#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/migration/migrate-users-dashboard.ts <options>

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

const { v4: uuidv4 } = require('uuid');

program.option('-e, --email <email>', "Email de l'utilisateur");
program.option('-r, --role <role>', 'Role');
program.option('-l, --limit <limit>', 'Limite');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();

  if (options.email && options.role) {
    logger.error(`Une seule option possible : email ou role`);
    return;
  }

  // pas de users existants grandReseau à migrer & 'prefet', 'hub_coop', 'coordinateur_coop' en standbye
  const allowedRoles = ['admin', 'structure'];
  let query = {
    token: uuidv4(),
    tokenCreatedAt: new Date(),
    mailSentDate: null,
    migrationDashboard: true,
  };
  if (options.email) {
    const user: IUser = await app.service(service.users).Model.findOne({
      name: options.email.toLowerCase(),
      migrationDashboard: { $ne: true }, // utile notamment avec le multi rôle
    });
    if (user === null) {
      logger.warn(`Utilisateur ${options.email} inconnu ou déjà migré`);
      return;
    }
    if (allowedRoles.some((role) => user.roles.includes(role)) === false) {
      logger.warn(`Rôle ${user.roles} de l'utilisateur non autorisé`);
      return;
    }
    if (user.roles.includes('structure')) {
      query = { ...query, ...{ mailSentCoselecDate: new Date() } };
    }
    await app
      .service(service.users)
      .Model.updateOne({ name: options.email.toLowerCase() }, query);
    logger.info(`Utilisateur ${options.email} invité au tableau de bord`);
    return;
  }

  if (options.role) {
    if (allowedRoles.includes(options.role) === false) {
      logger.warn(`Rôle ${options.role} non autorisé`);
      return;
    }

    const limit = options.limit ? parseInt(options.limit, 10) : 1;
    const promises: Promise<void>[] = [];

    const users: IUser[] = await app
      .service(service.users)
      .Model.find({
        roles: { $in: [options.role] },
        migrationDashboard: { $ne: true }, // Nécessaire pour n'inviter que les users autorisés & migrés & pas déjà invités (multi-rôles)
      })
      .limit(limit);

    if (users.length === 0) {
      logger.info(`Aucun compte user restant à migrer pour ce rôle`);
      return;
    }

    if (options.role === 'structure') {
      query = { ...query, ...{ mailSentCoselecDate: new Date() } };
    }

    users.forEach(async (user: IUser) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        try {
          await app
            .service(service.users)
            .Model.updateOne({ name: user.name }, query);
          logger.info(`Utilisateur ${user.name} invité au tableau de bord`);
          resolve(p);
        } catch (e) {
          logger.error(e);
        }
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    return;
  }
  logger.warn(`Aucune option fournie`);
  exit();
});
