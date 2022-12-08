#!/usr/bin/env node
/* eslint-disable prettier/prettier */

// Lancement de ce script : ts-node src/tools/migration/send-mails-invitations.ts

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

program.option('-r, --role <role>', 'Role');
program.parse(process.argv);

execute(__filename, async ({ app, emails, logger, exit }) => {
  const promises: Promise<void>[] = [];
  const options = program.opts();

  if (!options.role) {
    logger.error(`paramètre rôle manquant`);
    return;
  }

  const messageInvitation = emails.getEmailMessageByTemplateName('invitationActiveCompte');

  const users: IUser[] = await app
  .service(service.users)
  .Model
  .find({
    roles: {$in: [options.role] },
    mailSentDate: null,
    migrationDashboard: true, // Nécessaire pour inviter que les users autorisés & migrés
    token: { $ne: null }
  })
  .select({ name: 1, token: 1 });

  if (users.length === 0) {
    logger.info(`Aucun compte user restant à inviter pour ce rôle`)
    return;
  }

  users.forEach(async (user: IUser) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      await messageInvitation.send(user);
      logger.info(`Invitation envoyée pour ${user.name}`);
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
