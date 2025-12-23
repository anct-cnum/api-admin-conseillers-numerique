#!/usr/bin/env node

import { program } from 'commander';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import execute from '../utils';
import service from '../../helpers/services';
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
    const idIgnored = app.get('mattermost').idIgnored
      ? app.get('mattermost').idIgnored.split('|')
      : [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
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
    const conseillersIdMattermost = await app
      .service(service.conseillers)
      .Model.find({
        statut: 'RECRUTE',
        'mattermost.id': { $exists: true, $ne: null },
      })
      .distinct('mattermost.id');

    const utilisateursSansLesConseillersActif = reportsUsers.filter(
      (user) => !conseillersIdMattermost.includes(user.id.toString()),
    );
    logger.info(
      `Utilisateurs ignorés car le conseiller est en RECRUTE et l’ID Mattermost provient de l’ancien espace Coop : ${reportsUsers.length - utilisateursSansLesConseillersActif.length} \u26A0️`,
    );

    const UTILISATEUR_INACTIF_1_AN = utilisateursSansLesConseillersActif.filter(
      (utilisateur) =>
        utilisateur.last_login
          ? utilisateur.last_login < oneYearAgo.getTime()
          : utilisateur.update_at < oneYearAgo.getTime(),
    );
    logger.info(
      `Nombre d'utilisateurs à supprimer : ${UTILISATEUR_INACTIF_1_AN.length} \u2705`,
    );
    const csvFilePath = path.join(
      __dirname,
      `../../../datas/exports/utilisateurs-mattermost-a-supprimer-${new Date().toLocaleDateString('fr').replace(/\//g, '-')}.csv`,
    );
    const utilisateurActifARelancerPath = path.join(
      __dirname,
      `../../../datas/exports/utilisateurs-restante-domain-conum-${new Date().toLocaleDateString('fr').replace(/\//g, '-')}.csv`,
    );

    const dir = path.dirname(csvFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const generateCsv = (utilisateurs) => {
      let csv =
        "ID Utilisateur; Nom d'utilisateur; Email; Role; Dernière connexion\n";
      for (const utilisateur of utilisateurs) {
        csv += `${utilisateur.id};${utilisateur.username};${utilisateur.email};${utilisateur.roles};${new Date(utilisateur.last_login ?? utilisateur.update_at).toLocaleDateString('fr')}\n`;
      }
      return csv;
    };

    const utilisateurActifARelancer = reportsUsers.filter(
      (u) =>
        !UTILISATEUR_INACTIF_1_AN.map((user) => user.id.toString()).includes(
          u.id.toString(),
        ) && u.email.endsWith('@conseiller-numerique.fr'),
    );

    fs.writeFileSync(csvFilePath, generateCsv(UTILISATEUR_INACTIF_1_AN));
    fs.writeFileSync(
      utilisateurActifARelancerPath,
      generateCsv(utilisateurActifARelancer),
    );

    logger.info(`Fichier CSV généré \u2705`);
    let successCount = 0;
    let errorCount = 0;

    for (const utilisateur of UTILISATEUR_INACTIF_1_AN) {
      try {
        if (suppression && !idIgnored.includes(utilisateur.id.toString())) {
          // eslint-disable-next-line no-await-in-loop
          const result = await axios({
            method: 'delete',
            url: `${mattermost.endPoint}/api/v4/users/${utilisateur?.id}?permanent=true`,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          logger.info(
            `Suppresion OK - ${result.status}: ${utilisateur.id} (${utilisateur.username} - ${utilisateur.email})`,
          );
        } else if (
          suppression &&
          idIgnored.includes(utilisateur.id.toString())
        ) {
          logger.info(
            `Suppression annulée - ${utilisateur.id} (${utilisateur.username} - ${utilisateur.email}) \uD83D\uDEE1 \uD83D\uDEE1 \uD83D\uDEE1`,
          );
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

    logger.info(
      `\nRESULTAT de la suppression des utilisateurs mattermost inactifs`,
    );
    logger.info(`Succès: ${successCount} / ${UTILISATEUR_INACTIF_1_AN.length}`);
    logger.info(`Erreurs: ${errorCount} / ${UTILISATEUR_INACTIF_1_AN.length}`);
  } catch (error) {
    logger.error(error);
  }

  exit();
});
