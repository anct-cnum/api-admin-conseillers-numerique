#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/migration/relance-send-mails-invitations.ts -r <Role>

import { program } from 'commander';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { invitationActiveCompte } from '../../emails';

const { v4: uuidv4 } = require('uuid');

program.option('-r, --role <role>', 'Role');
program.option('-l, --limit <limit>', 'Limite');
program.parse(process.argv);

execute(__filename, async ({ app, mailer, logger, exit }) => {
  const promises: Promise<void>[] = [];
  const options = program.opts();
  const limit = options.limit ? parseInt(options.limit, 10) : 1;

  if (!options.role) {
    logger.error(`paramètre rôle manquant`);
    return;
  }

  const allowedRoles = [
    'admin',
    'grandReseau',
    'structure',
    'prefet',
    'coordinateur',
  ];

  if (allowedRoles.includes(options.role) === false) {
    logger.warn(`Rôle ${options.role} non autorisé`);
    return;
  }
  const structuresIdsIgnored: ObjectId[] = await app
    .service(service.structures)
    .Model.find({
      'conventionnement.statut': 'NON_INTERESSÉ',
      'coselec.type': { $exists: false },
      statut: 'VALIDATION_COSELEC',
    })
    .distinct('_id');
  const messageInvitation = invitationActiveCompte(app, mailer);
  const date = dayjs(Date()).subtract(28, 'days').format('YYYY/MM/DD 23:59:59');
  const users: IUser[] = await app
    .service(service.users)
    .Model.find({
      'entity.$id': { $nin: structuresIdsIgnored },
      roles: { $in: [options.role] },
      migrationDashboard: true,
      sub: { $exists: false },
      $or: [
        { tokenCreatedAt: { $lt: new Date(date) } },
        { tokenCreatedAt: null },
        { token: null },
      ],
    })
    .select({
      name: 1,
      roles: 1,
    })
    .limit(limit);

  logger.info(`${users.length} relance(s) pour les ${options.role}s`);
  if (users.length === 0) {
    exit();
    return;
  }
  users.forEach(async (userSendMail: IUser) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        let user = userSendMail[`${'_doc'}`];
        user = {
          ...user,
          token: uuidv4(),
        };
        await app.service(service.users).Model.updateOne(
          { name: user.name },
          {
            token: user.token,
            tokenCreatedAt: new Date(),
          },
        );
        await messageInvitation.send(user);
        logger.info(`Relance invitation envoyée pour ${user.name}`);
        resolve(p);
      } catch (e) {
        logger.error(e);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
