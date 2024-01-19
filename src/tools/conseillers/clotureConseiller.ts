#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/clotureConseiller.ts -f -fdb

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';
import mailer from '../../mailer';
import {
  conseillerRupturePix,
  suppressionCompteConseiller,
} from '../../emails';
import {
  getMisesEnRelationsFinaliseesNaturelles,
  getConseiller,
  nettoyageCoordinateur,
  updateConseillersPG,
  updateCacheObj,
  nettoyagePermanence,
} from '../../utils/functionsDeleteRoleConseiller';
import { deleteMattermostAccount } from '../../utils/mattermost';
import { deleteMailboxCloture } from '../../utils/gandi';

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

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
      $set: {
        disponible: true,
        dateDisponibilite: updatedAt,
        updatedAt,
      },
    },
  );

const updateConseillers = (app) => async (email, updatedAt) =>
  app.service(service.conseillers).Model.updateMany(
    { email },
    {
      $set: {
        disponible: true,
        dateDisponibilite: updatedAt,
        updatedAt,
      },
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
      },
      $unset: {
        resetPasswordCnil: '',
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

const createConseillersTermines =
  (app) => async (conseiller, miseEnRelationIdTerminee) => {
    const miseEnRelation = await app.service(service.misesEnRelation).findOne({
      _id: miseEnRelationIdTerminee._id,
    });
    await app.service(service.conseillersTermines).Model.create({
      conseillerId: conseiller._id,
      structureId: conseiller.structureId,
      typeContrat: miseEnRelation.typeDeContrat,
      dateDebutContrat: miseEnRelation.dateDebutDeContrat,
      dateFinContrat: miseEnRelation.dateFinDeContrat,
      phaseConventionnement: miseEnRelation?.phaseConventionnement ?? null,
      reconventionnement: miseEnRelation?.reconventionnement ?? false,
    });
  };

program
  .option(
    '-f, --fix',
    'fix: cloture des comptes de conseillers avec un statut terminee_naturelle',
  )
  .option(
    '-fdb, --flagDateDebut',
    'flagDateDebut: prendre la date du début du dispositif',
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, delay, Sentry }) => {
  try {
    const options = program.opts();
    const { fix, flagDateDebut } = options;
    const updatedAt = new Date();
    const dateMoins2Mois = dayjs(updatedAt).subtract(2, 'month');
    const dateMoins2MoisDebut = dayjs(
      flagDateDebut ? new Date('2020/11/01') : dateMoins2Mois,
    )
      .startOf('date')
      .toDate();
    const dateMoins2MoisFin = dayjs(dateMoins2Mois).endOf('date').toDate();

    logger.info('Cloture des contrats passer en statut terminee_naturelle');
    const termineesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
    )(dateMoins2MoisDebut, dateMoins2MoisFin);

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
        termineeNaturelle.conseillerId,
      );
      const user = await getUser(app)(termineeNaturelle.conseillerId);
      if (fix && conseiller && user) {
        const structuresIdsAutre = termineeNaturelle.structuresIdsAutre.filter(
          (structureId) => {
            return structureId !== null;
          },
        );
        const structureIdTerminee =
          termineeNaturelle.structuresIdsTerminee.filter((terminee) => {
            return terminee !== null;
          })[0];
        const miseEnRelationIdTerminee = termineeNaturelle._id.filter((id) => {
          return id !== null;
        })[0];

        if (
          !structuresIdsAutre.includes(structureIdTerminee) &&
          structureIdTerminee !== null
        ) {
          // suppression du conseiller dans les permanences / des permanences dans les cras
          await nettoyagePermanence(app)(
            structureIdTerminee,
            conseiller._id,
            updatedAt,
          ).then(async () => {
            logger.info(
              `Les permanences du conseiller (id: ${conseiller._id}) ont été supprimées et retirées des cras`,
            );
          });

          // suppression du conseiller dans les listes de coordinateur / du coordinateur dans les structures et les conseillers
          await nettoyageCoordinateur(app)(structureIdTerminee, conseiller)
            .then(async () => {
              await updateStructure(app)(
                structureIdTerminee,
                miseEnRelationIdTerminee,
              );
            })
            .then(async () => {
              logger.info(
                `Le conseiller (id: ${conseiller._id}) a été retiré des listes de coordinations`,
              );
            });

          // Historisation du conseiller terminé
          await createConseillersTermines(app)(
            conseiller,
            miseEnRelationIdTerminee,
          );

          if (structuresIdsAutre.length === 0) {
            // mise aux normes du conseiller et de l'utilisateur
            const pool = new Pool();
            const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
            await updateConseillersPG(pool)(conseiller.email, true, datePG)
              .then(async () => {
                await updateConseillers(app)(conseiller.email, updatedAt);
                await updateConseiller(app)(conseiller, updatedAt);
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
                await deleteMailboxCloture(app)(conseiller._id, user.name);
              })
              .then(async () => {
                logger.info(
                  `Les comptes Mattermost et Gandi du conseiller (id: ${conseiller._id} ont été supprimé`,
                );
              });

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
          }
          // Mise à jour du cache Obj
          await updateCacheObj(app)(conseiller._id);
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
