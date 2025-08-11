#!/usr/bin/env node

import { program } from 'commander';
import axios from 'axios';
import execute from '../utils';
import service from '../../helpers/services';
import { loginApi } from '../../utils/mattermost';

program
  .option('--analyse', 'Analyse des invitations à relancer (sans modification)')
  .parse();

const options = program.opts();

execute(__filename, async ({ logger, app, exit }) => {
  logger.info(`Début du script de relance invitations Mattermost`);

  const { analyse } = options;

  if (analyse) {
    logger.warn('Analyse sans modification');
  }

  try {
    const conseillers = await app.service(service.conseillers).Model.find({
      statut: 'RECRUTE',
      'mattermost.errorMessage': 'Request failed with status code 501',
    });

    logger.info(
      `${conseillers.length} conseiller(s) trouvé(s) avec l'erreur Mattermost 501`,
    );

    if (conseillers.length === 0) {
      logger.info('Aucun conseiller à traiter');
      exit();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const conseiller of conseillers) {
      try {
        if (!analyse) {
          const mattermost = app.get('mattermost');
          // eslint-disable-next-line no-await-in-loop
          const token = await loginApi({ mattermost });

          // eslint-disable-next-line no-await-in-loop
          const result = await axios({
            method: 'post',
            url: `${mattermost.endPoint}/api/v4/teams/${mattermost.teamId}/invite/email`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            data: [conseiller.email],
          });

          // eslint-disable-next-line no-await-in-loop
          const unsetResult = await app
            .service(service.conseillers)
            .Model.updateOne(
              { _id: conseiller._id },
              {
                $unset: {
                  'mattermost.errorMessage': '',
                  'mattermost.error': '',
                },
                $set: { 'mattermost.invitationCreateAccount': true },
              },
            );

          const conseillerInfo = `${conseiller._id} (${conseiller.nom} ${conseiller.prenom} - ${conseiller.email})`;
          if (unsetResult.modifiedCount === 1) {
            logger.info(`Rattrapage OK - ${result.status}: ${conseillerInfo}`);
          } else {
            throw new Error(`Echec du rattrapage pour ${conseillerInfo}`);
          }
        }
        // eslint-disable-next-line no-plusplus
        successCount++;
      } catch (error) {
        // eslint-disable-next-line no-plusplus
        errorCount++;
        logger.error(
          `Erreur pour le conseiller ${conseiller._id}:`,
          error.message,
        );
      }
    }

    logger.info(`\nRESULTAT du rattrapage - invitation mattermost`);
    logger.info(`Succès: ${successCount} / ${conseillers.length}`);
    logger.info(`Erreurs: ${errorCount} / ${conseillers.length}`);
  } catch (error) {
    logger.error(error);
  }

  exit();
});
