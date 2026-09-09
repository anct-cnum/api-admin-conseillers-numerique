#!/usr/bin/env node

import { program as cli } from 'commander';
import dayjs from 'dayjs';
import { getCoselec } from '../../utils/index';
import execute from '../utils';
import { uploadNdjsonToS3 } from './sit-utils';
import service from '../../helpers/services';

cli
  .description(
    'Export des structures validées en Coselec, destiné à la statistique des fiches territoriales',
  )
  .helpOption('-e', 'HELP command')
  .parse(process.argv);

execute(__filename, async ({ logger, app }: { logger: any; app: any }) => {
  if (!app.get('aws').endpoint) {
    logger.info('AWS non configuré');
    return;
  }

  logger.info(`Début de préparation des données structures...`);
  const structures = await app.service(service.structures).Model.aggregate([
    {
      $match: {
        statut: 'VALIDATION_COSELEC',
      },
    },
    {
      $project: {
        _id: 0,
        nom: 1,
        coselec: 1,
        codeCommune: 1,
        codeDepartement: 1,
        codeRegion: 1,
      },
    },
  ]);

  const structuresTransformees = structures.map((structure: any) => {
    const { coselec, ...rest } = structure;
    return {
      ...rest,
      dernierCoselec: {
        nombreConseillersCoselec:
          getCoselec(structure).nombreConseillersCoselec,
      },
    };
  });

  logger.info(`Préparation des données structures : OK`);

  const today = dayjs(new Date()).format('YYYY-MM-DD');

  logger.info(`Upload du fichier structures sur S3 en cours...`);

  try {
    await uploadNdjsonToS3({
      awsConfig: app.get('aws'),
      bucket: app.get('aws').sit_bucket,
      key: `structures_sit_${today}.ndjson`,
      body: structuresTransformees.map(JSON.stringify).join('\n'),
    });
    logger.info(
      `Fichier structures (fiches territoriales) déposé sur S3 avec ${structuresTransformees.length} structures validées Coselec`,
    );
  } catch (S3error) {
    logger.error(
      `Erreur lors de l'export du fichier structures (fiches territoriales) vers S3: ${S3error}`,
    );
    throw S3error;
  }
});
