#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/clotureConseiller.ts

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';
import mailer from '../../mailer';
import {
  conseillerFinContratNaturellePix,
  conseillerFinContratStructure,
} from '../../emails';
import {
  deleteConseillerInCoordinateurs,
  deletePermanences,
  updatePermanences,
  deletePermanencesInCras,
  deleteMattermostAccount,
  deleteMailbox,
} from '../../utils/functionsDeleteConseiller';

const { v4: uuidv4 } = require('uuid');

const getMisesEnRelationsFinaliseesNaturelles = (app) => async (date) =>
  app
    .service(service.misesEnRelation)
    .Model.find({
      statut: 'terminee_naturelle',
      dateFinDeContrat: { $lte: date },
    })
    .limit(1);

const getConseiller = (app) => async (id) =>
  app.service(service.conseillers).Model.find({
    _id: id,
  });

const updateConseiller = (app) => async (conseiller, updatedAt) =>
  app.service(service.conseillers).Model.updateOne(
    {
      _id: conseiller._id,
    },
    {
      $set: { updatedAt },
    },
    {
      $unset: {
        estRecrute: '',
        structureId: '',
        emailCNError: '',
        emailCN: '',
        emailPro: '',
        telephonePro: '',
        supHierarchique: '',
        mattermost: '',
        resetPasswordCNError: '',
        codeRegionStructure: '',
        codeDepartementStructure: '',
        hasPermanence: '',
        coordinateurs: '',
        listeSubordonnes: '',
        estCoordinateur: '',
        nonAffichageCarto: '',
      },
    },
  );

const getUser = (app) => async (idConseiller) =>
  app.service(service.users).Model.find({
    'entity.$id': idConseiller,
    roles: { $in: ['conseiller'] },
  });

const updateUser = (app) => async (idUser, email) =>
  app.service(service.users).Model.updateOne(
    {
      _id: idUser,
    },
    {
      $set: {
        name: email,
        roles: ['candidat'],
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        mailSentDate: null,
        passwordCreated: false,
      },
    },
  );

program
  .option(
    '-f, --fix',
    'fix: mise à jour des mises en relation en statut terminee_naturelle',
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const options = program.opts();
    const { fix } = options;
    const updatedAt = new Date();
    const dateMoins2Mois = dayjs(updatedAt).subtract(2, 'month');

    logger.info('Cloture des contrats passer en statut terminee_naturelle');
    const finaliseesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
    )(dateMoins2Mois);

    if (finaliseesNaturelles.length === 0) {
      logger.info(`Aucun contrat n'a été trouvé`);
      exit();
      return;
    }

    logger.info(
      `Il y a ${finaliseesNaturelles.length} conseillers comportant le statut terminee_naturelle.`,
    );
    for (const finaliseeNaturelle of finaliseesNaturelles) {
      logger.info(
        // eslint-disable-next-line
        `Le conseiller (idPG: ${finaliseeNaturelle.conseillerObj.idPG}) va être traité.`,
      );
      const conseiller = await getConseiller(app)(
        finaliseeNaturelle.conseiller.$id,
      );
      const user = await getUser(app)(conseiller._id);

      if (fix) {
        // suppression du conseiller dans les permanences
        await deletePermanences(app)(conseiller._id).then(async () => {
          logger.info(
            `Les permanences comportant le conseiller (id: ${conseiller._id}) ont été supprimées`,
          );
        });
        await updatePermanences(app)(conseiller._id).then(async () => {
          logger.info(
            `Le conseiller (id: ${conseiller._id}) a été retiré des permanences dans lesquels il était présent`,
          );
        });
        await deletePermanencesInCras(app)(conseiller._id, updatedAt).then(
          async () => {
            logger.info(
              `Les permanences du conseiller (id: ${conseiller._id}) ont été retirées des cras`,
            );
          },
        );

        // suppression du conseiller dans les listes de coordinateur
        if (conseiller?.coordinateurs) {
          await deleteConseillerInCoordinateurs(app)(conseiller).then(
            async () => {
              logger.info(
                `Le conseiller (id: ${conseiller._id}) a été retiré des listes de coordinations`,
              );
            },
          );
        }

        // mise aux normes du conseiller
        await updateConseiller(app)(conseiller, updatedAt).then(async () => {
          logger.info(
            `Le conseiller a été remis à zéro (id: ${conseiller._id}`,
          );
        });

        // suppression des outils (Mattermost, Gandi, PIX)
        await deleteMattermostAccount(app)(conseiller).then(async () => {
          logger.info(
            `Le compte Mattermost du conseiller (id: ${conseiller._id} a été supprimé`,
          );
        });
        await deleteMailbox(app)(conseiller._id, user.name).then(async () => {
          logger.info(
            `Le compte Gandi du conseiller (id: ${conseiller._id} a été supprimé`,
          );
        });
        const mailerInstance = mailer(app);
        const messageFinContratPix =
          conseillerFinContratNaturellePix(mailerInstance);
        const errorSmtpMailFinContratPix = await messageFinContratPix
          .send(conseiller)
          .catch((errSmtp: Error) => {
            logger.error(errSmtp);
          });
        if (errorSmtpMailFinContratPix instanceof Error) {
          logger.error(errorSmtpMailFinContratPix.message);
        }
        const messageFinContratStructure = conseillerFinContratStructure(
          app,
          mailerInstance,
        );
        const errorSmtpMailFinContratStructure =
          await messageFinContratStructure
            .send(finaliseeNaturelle, finaliseeNaturelle.structureObj)
            .catch((errSmtp: Error) => {
              logger.error(errSmtp);
            });
        if (errorSmtpMailFinContratStructure instanceof Error) {
          logger.error(errorSmtpMailFinContratStructure.message);
        }
        // mise aux normes de l'utilisateur
        await updateUser(app)(user._id, conseiller.email).then(async () => {
          logger.info(
            `Le user a été passé en candidat avec son adresse email d'origine (id: ${user._id}`,
          );
        });
      }
    }
  } catch (error) {
    logger.error(error);
  }
  exit();
});
