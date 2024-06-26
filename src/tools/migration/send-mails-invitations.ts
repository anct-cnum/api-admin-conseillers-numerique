#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/migration/send-mails-invitations.ts <option>

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import {
  informationValidationCoselec,
  invitationActiveCompte,
  informationValidationCoselecCoordinateur,
} from '../../emails';

program.option('-r, --role <role>', 'Role');
program.option('-l, --limit <limit>', 'Limite');
program.parse(process.argv);

execute(__filename, async ({ app, mailer, logger, exit }) => {
  const promises: Promise<void>[] = [];
  let messageInformationCoselec: null | {
    render: (user: IUser) => Promise<any>;
    send: (user: IUser) => Promise<any>;
  } = null;
  let messageInformationCoselecCoordinateur: null | {
    render: (user: IUser) => Promise<any>;
    send: (user: IUser) => Promise<any>;
  } = null;
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
    'hub',
  ];

  if (allowedRoles.includes(options.role) === false) {
    logger.warn(`Rôle ${options.role} non autorisé`);
    return;
  }

  const messageInvitation = invitationActiveCompte(app, mailer);
  if (options.role === 'structure') {
    messageInformationCoselec = informationValidationCoselec(app, mailer);
    messageInformationCoselecCoordinateur =
      informationValidationCoselecCoordinateur(app, mailer);
  }

  const users: IUser[] = await app
    .service(service.users)
    .Model.find({
      roles: { $in: [options.role] },
      mailSentDate: null,
      migrationDashboard: true, // Nécessaire pour inviter que les users autorisés & migrés
      token: { $ne: null },
    })
    .select({
      name: 1,
      token: 1,
      entity: 1,
      mailSentCoselecDate: 1,
      mailSentCoselecCoordinateurDate: 1,
      roles: 1,
    })
    .limit(limit);

  if (users.length === 0) {
    exit();
    return;
  }

  users.forEach(async (user: IUser) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve) => {
      try {
        if (
          messageInformationCoselec &&
          messageInformationCoselecCoordinateur
        ) {
          const structure = await app
            .service(service.structures)
            .Model.findOne({
              _id: user.entity.oid,
            });
          if (structure.statut !== 'VALIDATION_COSELEC') {
            logger.warn(
              `Invitation NON envoyée pour ${user.name} : structure en statut ${structure.statut}`,
            );
            resolve(p);
            return;
          }
          const demandeCoordinateurValider =
            structure?.demandesCoordinateur?.find(
              (demande) => demande.statut === 'validee',
            );
          if (!user.mailSentCoselecDate && !demandeCoordinateurValider) {
            await messageInformationCoselec.send(user);
          }
          if (
            !user.mailSentCoselecCoordinateurDate &&
            demandeCoordinateurValider
          ) {
            await messageInformationCoselecCoordinateur.send(user);
          }
        }
        await messageInvitation.send(user);
        logger.info(`Invitation envoyée pour ${user.name}`);
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
