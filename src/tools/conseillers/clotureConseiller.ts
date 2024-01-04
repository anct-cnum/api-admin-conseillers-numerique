#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/clotureConseiller.ts

import { program } from 'commander';
import dayjs from 'dayjs';
import service from '../../helpers/services';
import mailer from '../../mailer';
import {
  conseillerRupturePix,
  suppressionCompteConseillerStructure,
  suppressionCompteConseiller,
} from '../../emails';
import {
  getMisesEnRelationsFinaliseesNaturelles,
  getConseiller,
  deleteConseillerInCoordinateurs,
  deleteCoordinateurInConseillers,
  updateCacheObj,
  deletePermanences,
  updatePermanences,
  deletePermanencesInCras,
  deleteMattermostAccount,
  deleteMailbox,
} from '../../utils/functionsDeleteRoleConseiller';

const { v4: uuidv4 } = require('uuid');
const { execute, delay } = require('../utils');

const getUser = (app) => async (idConseiller) =>
  app.service(service.users).Model.findOne({
    'entity.$id': idConseiller,
    roles: { $in: ['conseiller'] },
  });

const updateConseiller = (app) => async (conseiller, updatedAt) =>
  app.service(service.conseillers).Model.updateOne(
    {
      _id: conseiller._id,
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
      },
      $set: { updatedAt },
    },
  );

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
        resetPasswordCnil: false,
      },
    },
  );

const updateStructure = (app) => async (structureId, miseEnRelationId) => {
  await app.service(service.structures).Model.updateOne(
    {
      _id: structureId,
      demandesCoordinateur: {
        $elemMatch: {
          statut: 'validee',
          miseEnRelationId,
        },
      },
    },
    {
      $unset: {
        'demandesCoordinateur.$.miseEnRelationId': '',
      },
    },
  );
  await app.service(service.misesEnRelation).Model.updateMany(
    {
      'structure.$id': structureId,
      'structureObj.demandesCoordinateur': {
        $elemMatch: {
          statut: 'validee',
          miseEnRelationId,
        },
      },
    },
    {
      $unset: {
        'structureObj.demandesCoordinateur.$.miseEnRelationId': '',
      },
    },
  );
};

const createConseillersTermines = (app) => async (conseiller, miseEnRelation) =>
  app.service(service.conseillersTermines).Model.create({
    conseillerId: conseiller._id,
    structureId: conseiller.structureId,
    typeContrat: miseEnRelation.typeDeContrat,
    dateDebutContrat: miseEnRelation.dateDebutDeContrat,
    dateFinContrat: miseEnRelation.dateFinDeContrat,
    phaseConventionnement: miseEnRelation?.phaseConventionnement ?? null,
    reconventionnement: miseEnRelation?.reconventionnement ?? false,
  });

program
  .option(
    '-f, --fix',
    'fix: cloture des comptes de conseillers avec un statut terminee_naturelle',
  )
  .option(
    '-l --limit <limit>',
    'limite le nombre de traitement (par défaut: 1)',
    parseInt,
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, Sentry }) => {
  try {
    const options = program.opts();
    const { fix, limit } = options;
    const updatedAt = new Date();
    const dateMoins2Mois = dayjs(updatedAt).subtract(2, 'month');

    logger.info('Cloture des contrats passer en statut terminee_naturelle');
    const termineesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
      limit,
    )(dateMoins2Mois);

    if (termineesNaturelles.length === 0) {
      logger.info(`Fin de contrat naturelle : aucun contrat à clôturer`);
      exit();
      return;
    }

    logger.info(
      `Il y a ${termineesNaturelles.length} conseillers comportant le statut terminee_naturelle.`,
    );
    for (const termineeNaturelle of termineesNaturelles) {
      const conseiller = await getConseiller(app)(
        termineeNaturelle.conseiller.oid,
      );
      const user = await getUser(app)(termineeNaturelle.conseiller.oid);

      if (fix) {
        // suppression du conseiller dans les permanences
        await deletePermanences(app)(conseiller._id)
          .then(async () => {
            await updatePermanences(app)(conseiller._id);
          })
          .then(async () => {
            await deletePermanencesInCras(app)(conseiller._id, updatedAt);
          })
          .then(async () => {
            logger.info(
              `Les permanences du conseiller (id: ${conseiller._id}) ont été supprimées et retirées des cras`,
            );
          });
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
        // suppression du coordinateur dans les structures et les conseillers
        if (conseiller.estCoordinateur) {
          await deleteCoordinateurInConseillers(app)(conseiller).then(
            async () => {
              await updateStructure(app)(
                termineeNaturelle.structure.oid,
                termineeNaturelle._id,
              );
            },
          );
        }
        // mise aux normes du conseiller et de l'utilisateur
        await updateConseiller(app)(conseiller, updatedAt)
          .then(async () => {
            await createConseillersTermines(app)(conseiller, termineeNaturelle);
          })
          .then(async () => {
            await updateUser(app)(user._id, conseiller.email);
          })
          .then(async () => {
            logger.info(
              `Le conseiller (id: ${conseiller._id}) a été remis à zéro et le user (id: ${user._id}) a été passé en candidat avec son adresse email d'origine`,
            );
          });
        // suppression des outils (Mattermost, Gandi)
        await deleteMattermostAccount(app)(conseiller)
          .then(async () => {
            await deleteMailbox(app)(conseiller._id, user.name);
          })
          .then(async () => {
            logger.info(
              `Les comptes Mattermost et Gandi du conseiller (id: ${conseiller._id} ont été supprimé`,
            );
          });

        // Mise à jour du cache Obj
        await updateCacheObj(app)(conseiller);

        // Envoi des emails de cloture de compte pour PIX / le conseiller / la structure
        const mailerInstance = mailer(app);
        const messageFinContratPix = conseillerRupturePix(mailerInstance);
        const errorSmtpMailFinContratPix = await messageFinContratPix
          .send(conseiller)
          .catch((errSmtp: Error) => {
            logger.error(errSmtp);
            Sentry.captureException(errSmtp);
          });
        if (errorSmtpMailFinContratPix instanceof Error) {
          logger.error(errorSmtpMailFinContratPix.message);
          Sentry.captureException(errorSmtpMailFinContratPix.message);
        }

        const messageFinContratConseiller =
          suppressionCompteConseiller(mailerInstance);
        const errorSmtpMailFinContrat = await messageFinContratConseiller
          .send(conseiller)
          .catch((errSmtp: Error) => {
            logger.error(errSmtp);
            Sentry.captureException(errSmtp);
          });
        if (errorSmtpMailFinContrat instanceof Error) {
          logger.error(errorSmtpMailFinContrat.message);
          Sentry.captureException(errorSmtpMailFinContrat.message);
        }

        const messageFinContratStructure = suppressionCompteConseillerStructure(
          app,
          mailerInstance,
        );
        const errorSmtpMailFinContratStructure =
          await messageFinContratStructure
            .send(termineeNaturelle, termineeNaturelle.structureObj)
            .catch((errSmtp: Error) => {
              logger.error(errSmtp);
              Sentry.captureException(errSmtp);
            });
        if (errorSmtpMailFinContratStructure instanceof Error) {
          logger.error(errorSmtpMailFinContratStructure.message);
          Sentry.captureException(errorSmtpMailFinContratStructure.message);
        }
      }
      await delay(2000);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  exit();
});
