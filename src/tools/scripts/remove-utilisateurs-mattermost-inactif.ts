#!/usr/bin/env node

import { program } from 'commander';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import execute from '../utils';
import { loginApi } from '../../utils/mattermost';

// node_modules/.bin/ts-node src/tools/scripts/remove-utilisateurs-mattermost-inactif.ts --suppression

program
  .option('--suppression', 'Suppression des utilisateurs inactifs')
  .parse();

const options = program.opts();

execute(__filename, async ({ logger, app, exit }) => {
  logger.info(`Début du script de suppression utilisateurs Mattermost`);

  const { suppression } = options;

  if (suppression) {
    logger.warn('Suppression des utilisateurs inactifs \u274C \u274C \u274C');
  } else {
    logger.warn(
      'Analyse sans suppression \uD83D\uDD0D \uD83D\uDD0D \uD83D\uDD0D',
    );
  }

  try {
    const mattermost = app.get('mattermost');
    // eslint-disable-next-line no-await-in-loop
    const token = await loginApi({ mattermost });
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(23, 59, 59, 999);
    const reportsUsers = [];

    const countUtilisateurMattermost = await axios({
      method: 'get',
      url: `${mattermost.endPoint}/api/v4/reports/users/count`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    logger.info(
      `${countUtilisateurMattermost.data} utilisateur(s) récupéré(s) sur le Mattermost le ${new Date().toLocaleDateString('fr')} \u2139`,
    );
    for (
      let page = 0;
      page < Math.ceil(countUtilisateurMattermost.data / 100);
      page += 1
    ) {
      // eslint-disable-next-line no-await-in-loop
      const utilisateurs = await axios({
        method: 'get',
        url: `${mattermost.endPoint}/api/v4/reports/users?page_size=100&from_column_value=${reportsUsers.slice(-1)[0]?.username || ''}&from_id=${reportsUsers.slice(-1)[0]?.id || ''}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      reportsUsers.push(...utilisateurs.data);
    }
    logger.info(
      `Nombre total d'utilisateurs récupérés: ${reportsUsers.length} \u2705`,
    );
    const ONE_YEAR_AGO = oneYearAgo.getTime();
    const UTILISATEUR_INACTIF_1_AN = reportsUsers.filter((utilisateur) => {
      const lastStatusAt = utilisateur.last_status_at ?? 0;
      const lastPostDate = utilisateur.last_post_date ?? 0;
      const lastLogin = utilisateur.last_login ?? 0;

      const lastActivity = Math.max(lastStatusAt, lastPostDate, lastLogin);
      return lastActivity === 0 || lastActivity < ONE_YEAR_AGO;
    });
    logger.info(
      `Nombre d'utilisateurs à supprimer : ${UTILISATEUR_INACTIF_1_AN.length} \u2705`,
    );
    const csvFilePath = (name) =>
      path.join(
        __dirname,
        `../../../datas/exports/${name}-${new Date().toLocaleDateString('fr').replace(/\//g, '-')}.csv`,
      );
    if (!fs.existsSync(path.join(__dirname, '../../../datas/exports'))) {
      fs.mkdirSync(path.join(__dirname, '../../../datas/exports'), {
        recursive: true,
      });
    }

    const generateCsv = (utilisateurs) => {
      let csv =
        "ID Utilisateur; Nom d'utilisateur; Email; Role; Dernière activité; last_login; last_post_date; last_status_at\n";
      for (const utilisateur of utilisateurs) {
        csv += `${utilisateur.id};${utilisateur.username};${utilisateur.email};${utilisateur.roles};${new Date(Math.max(utilisateur.last_status_at ?? 0, utilisateur.last_post_date ?? 0, utilisateur.last_login ?? 0)).toLocaleDateString('fr')};${new Date(utilisateur.last_login ?? 0).toLocaleDateString('fr')};${new Date(utilisateur.last_post_date ?? 0).toLocaleDateString('fr')};${new Date(utilisateur.last_status_at ?? 0).toLocaleDateString('fr')}\n`;
      }
      return csv;
    };

    const utilisateurActifARelancer = reportsUsers.filter(
      (u) =>
        !UTILISATEUR_INACTIF_1_AN.map((user) => user.id.toString()).includes(
          u.id.toString(),
        ) && u.email.endsWith('@conseiller-numerique.fr'),
    );

    fs.writeFileSync(
      csvFilePath('utilisateurs-mattermost-a-supprimer'),
      generateCsv(UTILISATEUR_INACTIF_1_AN),
    );
    fs.writeFileSync(
      csvFilePath('utilisateurs-restante-domain-conum'),
      generateCsv(utilisateurActifARelancer),
    );

    logger.info(`Fichier CSV généré \u2705`);
    let successCount = 0;
    let errorCount = 0;

    for (const utilisateur of UTILISATEUR_INACTIF_1_AN) {
      try {
        if (suppression) {
          // eslint-disable-next-line no-await-in-loop
          await axios({
            method: 'delete',
            url: `${mattermost.endPoint}/api/v4/users/${utilisateur?.id}?permanent=true`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
        }
        // eslint-disable-next-line no-plusplus
        successCount++;
      } catch (error) {
        // eslint-disable-next-line no-plusplus
        errorCount++;
        logger.error(
          `Erreur pour l'utilisateur ${utilisateur._id}:`,
          error.message,
        );
      }
    }

    logger.info(`\nRESULTAT \n---------------------`);
    logger.info(`Succès: ${successCount} / ${UTILISATEUR_INACTIF_1_AN.length}`);
    logger.info(`Erreurs: ${errorCount} / ${UTILISATEUR_INACTIF_1_AN.length}`);
  } catch (error) {
    logger.error(error);
  }

  exit();
});
