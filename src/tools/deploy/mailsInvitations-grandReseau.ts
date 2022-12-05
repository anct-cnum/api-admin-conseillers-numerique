#!/usr/bin/env node
/* eslint-disable prettier/prettier */

// Lancement de ce script : ts-node src/tools/deploy/mailsInvitations-grandReseau.ts -c <file>

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

program.parse(process.argv);

execute(__filename, async ({ app, emails, logger, exit }) => {
  const promises = [];

  const messageInvitation = emails.getEmailMessageByTemplateName('invitationActiveCompte');

  const users: IUser[] = await app
  .service(service.users)
  .Model
  .find({
    roles: ['grandReseau'],
    mailSentDate: null
  })
  .select({ name: 1, token: 1 });

  users.forEach(async (user: IUser) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise(async (resolve) => {
      await messageInvitation.send(user);
      logger.info(`Invitation envoyée pour ${user.name}`);
      resolve(p);
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  exit();
});
