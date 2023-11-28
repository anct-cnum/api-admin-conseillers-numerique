#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/scripts/add-rule-structure-to-admin.ts <options>

import { program } from 'commander';
import { ObjectId, DBRef } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';

program.option('-e, --email <email>', "Email de l'utilisateur");
program.option(
  '-s, --structureId <structureId>',
  'oid structure Caisse Des Dépôts',
);
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();

  if (
    !options.email ||
    !options.structureId ||
    !ObjectId.isValid(options.structureId)
  ) {
    logger.error(`Veuillez renseigner un email et un oid structure valide`);
    return;
  }

  const user: IUser = await app
    .service(service.users)
    .Model.findOne({ name: options.email.toLowerCase() });

  if (user === null) {
    logger.warn(`Utilisateur ${options.email} inconnu`);
    return;
  }

  if (!user.roles.includes('admin')) {
    logger.warn(`Utilisateur ${options.email} non admin`);
    return;
  }

  if (user.roles.includes('structure')) {
    logger.warn(`Utilisateur ${options.email} a déjà le rôle structure`);
    return;
  }

  const structure: IStructures = await app
    .service(service.structures)
    .Model.findOne({ _id: new ObjectId(options.structureId) });

  if (structure?.nom !== 'CAISSE DES DEPOTS ET CONSIGNATIONS') {
    logger.warn(
      `Structure introuvable ou ne correspond pas à la structure de la Caisse des dépôts`,
    );
    return;
  }

  const connect = app.get('mongodb');
  const database = connect.substr(connect.lastIndexOf('/') + 1);
  const queryUpd = {
    $push: {
      roles: 'structure',
    },
    $set: {
      entity: new DBRef(
        'structures',
        new ObjectId(options.structureId),
        database,
      ),
    },
  };

  await app
    .service(service.users)
    .Model.updateOne({ name: options.email.toLowerCase() }, queryUpd);

  logger.info(`Rôle structure ajouté pour l'utilisateur ${options.email}`);
  exit();
});
