#!/usr/bin/env node
import { program as cli } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import { uploadNdjsonToS3 } from './sit-utils';
import service from '../../helpers/services';

cli
  .description(
    'Export conseillers recrutés, destiné à la statistique des fiches territoriales',
  )
  .helpOption('-e', 'HELP command')
  .parse(process.argv);

execute(__filename, async ({ logger, app }: { logger: any; app: any }) => {
  if (!app.get('aws').endpoint) {
    logger.info('AWS non configuré');
    return;
  }

  logger.info(`Début de préparation des données conseillers...`);
  const today = dayjs(new Date()).format('YYYY-MM-DD');
  const conseillers = await app.service(service.conseillers).Model.aggregate([
    {
      $match: {
        statut: 'RECRUTE',
      },
    },
    {
      $project: {
        _id: 0,
        codeDepartementStructure: 1,
        codeRegionStructure: 1,
        estEnFormation: 1,
        dateFinFormation: 1,
        statut: 1,
      },
    },
  ]);

  logger.info(`Préparation des données conseillers : OK`);

  logger.info(`Upload du fichier cnfs sur S3 en cours...`);

  try {
    await uploadNdjsonToS3({
      awsConfig: app.get('aws'),
      bucket: app.get('aws').sit_bucket,
      key: `cnfs_sit_${today}.ndjson`,
      body: conseillers.map(JSON.stringify).join('\n'),
    });
    logger.info(
      `Fichier cnfs (fiches territoriales) déposé sur S3 avec ${conseillers.length} conseiller(s) récruté(s)`,
    );
  } catch (S3error) {
    logger.error(
      `Erreur export du fichier cnfs (fiches territoriales) sur S3 : ${S3error}`,
    );
    throw S3error;
  }
});
