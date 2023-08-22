#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/scripts/create-csv-liste-coordinateur.ts

import execute from '../utils';
import service from '../../helpers/services';

const path = require('path');
const fs = require('fs');

execute(__filename, async ({ app, logger, exit }) => {
  const csvCellSeparator = ';';
  const csvLineSeparator = '\n';
  const conseillers = await app.service(service.conseillers).Model.aggregate([
    {
      $match: {
        estCoordinateur: true,
        statut: 'RECRUTE',
      },
    },
    {
      $lookup: {
        from: 'structures',
        localField: 'structureId',
        foreignField: '_id',
        as: 'structure',
      },
    },
    {
      $unwind: '$structure',
    },
    {
      $project: {
        _id: 0,
        idPG: 1,
        nom: 1,
        prenom: 1,
        structure: 1,
      },
    },
  ]);
  const csvFile = path.join(__dirname, '../../../datas/coordinateurs.csv');
  const file = fs.createWriteStream(csvFile, {
    flags: 'w',
  });
  logger.info(`Generating CSV file...`);
  try {
    const fileHeaders = [
      'Nom du conseiller',
      'Prénom du conseiller',
      'Nom de la structure',
      'SIRET de la structure',
      'Coordonnées de la structure',
    ];
    file.write(
      [
        fileHeaders.join(csvCellSeparator),
        ...conseillers.map((conseiller) =>
          [
            conseiller.nom,
            conseiller.prenom,
            conseiller.structure.nom,
            conseiller.structure.siret,
            conseiller.structure?.contact?.telephone?.length >= 10
              ? conseiller.structure?.contact?.telephone.replace(/[- ]/g, '')
              : 'Non renseigné',
          ].join(csvCellSeparator),
        ),
      ].join(csvLineSeparator),
    );
    file.close();
    logger.info(`CSV file generated`);
    exit();
  } catch (error) {
    logger.error(error);
    exit();
  }
});
