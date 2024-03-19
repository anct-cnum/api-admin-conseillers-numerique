#!/usr/bin/env node

// ts-node src/tools/structures/traitement-reintegration-structure.ts -i XXX

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { IStructures } from '../../ts/interfaces/db.interfaces';

program.option('-i, --idPG <idPG>', 'idPG de la structure');
program.option('-d, --demande <demande>', 'nombre de poste demander');
program.parse(process.argv);

const { Pool } = require('pg');

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const nombrePosteDemander = Number(options.demande ?? '1');
  const pool = new Pool();

  if (Number.isNaN(Number(options.idPG))) {
    logger.error(`Veuillez renseigner un idPG valide.`);
    return;
  }
  const structure: IStructures = await app
    .service(service.structures)
    .Model.findOne({
      idPG: options.idPG,
    });

  if (!structure || structure?.statut === 'VALIDATION_COSELEC') {
    logger.info(
      `${structure?.statut === 'VALIDATION_COSELEC' ? `La structure ${options.idPG} est déjà dans le dispositif` : 'Structure non trouvée.'}`,
    );
    return;
  }
  await pool.query(
    `
      UPDATE djapp_hostorganization
      SET coaches_requested = $2
      WHERE id = $1`,
    [structure.idPG, nombrePosteDemander],
  );
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateOne(
      {
        _id: structure._id,
      },
      {
        $set: {
          statut: 'CREEE',
          nombreConseillersSouhaites: nombrePosteDemander,
        },
      },
    );
  if (structureUpdated.modifiedCount === 0) {
    logger.error(`La structure ${structure?._id} n'a pas été mise à jour.`);
    return;
  }
  logger.info(
    `La structure ${structure?._id} a été mise à jour de ${structure?.statut} à CREEE avec ${nombrePosteDemander} poste(s) demander. (Ancien poste demander : ${structure?.nombreConseillersSouhaites})`,
  );
  exit();
});
