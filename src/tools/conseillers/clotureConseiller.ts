#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/clotureConseiller.ts -f

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

const updateConseiller = (app) => async (conseiller) =>
  app.service(service.conseillers).Model.findOneAndUpdate(
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
      },
    },
    {
      new: true,
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

const checkAndUpdatePermanence =
  (app) => async (structuresIdsRecruteeEtFinalisee, conseillerId) => {
    const countPermanence = await app
      .service(service.permanences)
      .Model.countDocuments({
        conseillers: { $in: [conseillerId] },
        'structure.$id': { $in: structuresIdsRecruteeEtFinalisee },
      });

    if (countPermanence === 0) {
      await app.service(service.conseillers).Model.updateOne(
        {
          _id: conseillerId,
        },
        {
          $unset: {
            hasPermanence: '',
          },
        },
      );
      await app.service(service.misesEnRelation).Model.updateMany(
        {
          'conseiller.$id': conseillerId,
        },
        {
          $unset: {
            'conseillerObj.hasPermanence': '',
          },
        },
      );
    }
  };

program
  .option(
    '-f, --fix',
    'fix: cloture des comptes de conseillers avec un statut terminee_naturelle',
  )
  .option(
    '-dd, --dateDebut',
    'dateDebut: cloture des comptes de conseillers à partir du 1er février 2021 pour le premier envoi',
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, delay, Sentry }) => {
  try {
    const options = program.opts();
    const { fix, dateDebut } = options;
    const updatedAt = new Date();
    // Première fin de contrat détectée en février 2021
    const datePremierPassage = dayjs(new Date('2021-02-01'))
      .startOf('date')
      .toDate();
    const dateMoins2Mois = dayjs(updatedAt).subtract(2, 'month');
    const dateMoins2MoisDebut = dayjs(dateMoins2Mois).startOf('date').toDate();
    const dateMoins2MoisFin = dayjs(dateMoins2Mois).endOf('date').toDate();

    let countSucess = 0;
    let countError = 0;
    let countInexistant = 0;

    logger.info('Cloture des contrats passer en statut terminee_naturelle');
    const termineesNaturelles = await getMisesEnRelationsFinaliseesNaturelles(
      app,
    )(dateDebut ? datePremierPassage : dateMoins2MoisDebut, dateMoins2MoisFin);

    if (termineesNaturelles.length === 0) {
      logger.info(`Fin de contrat naturelle : aucun contrat à clôturer`);
      exit();
      return;
    }

    for (const termineeNaturelle of termineesNaturelles) {
      const conseiller = await getConseiller(app)(
        termineeNaturelle.conseillerId,
      );
      const user = await getUser(app)(termineeNaturelle.conseillerId);

      if (fix && conseiller && user) {
        const structuresIdsRecruteeEtFinalisee =
          termineeNaturelle.structuresIdsAutre.filter(
            (structureId) => structureId !== null,
          );
        const structureIdTerminee =
          termineeNaturelle.structuresIdsTerminee.filter(
            (terminee) => terminee !== null,
          )[0];
        const miseEnRelationIdTerminee = termineeNaturelle._id.filter(
          (id) => id !== null,
        )[0];
        // Contrôler si la structure qui est en fin de contrat n'a pas réembauché (recrutee, finalisee) le conseiller
        if (!structuresIdsRecruteeEtFinalisee.includes(structureIdTerminee)) {
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

          // Contrôler s'il n'y a aucune autre mise en relation (recrutee, finalisee) que celle de la structure en fin de contrat
          if (structuresIdsRecruteeEtFinalisee.length === 0) {
            // mise aux normes du conseiller et de l'utilisateur
            const pool = new Pool();
            const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
            try {
              await updateConseillersPG(pool)(conseiller.email, true, datePG);
              await updateConseillers(app)(conseiller.email, updatedAt);
              const conseillerUpdated = await updateConseiller(app)(conseiller);
              await updateUser(app)(user._id, conseiller.email);
              logger.info(
                `Le conseiller (id: ${conseiller._id}) a été remis à zéro et le user (id: ${user._id}) a été passé en candidat avec son adresse email d'origine`,
              );

              // suppression des outils (Mattermost, Gandi)

              // Suppression compte Mattermost
              if (conseiller?.faker !== true) {
                await deleteMattermostAccount(app)(conseiller)
                  .then(async () => {
                    if (user.name !== undefined) {
                      await deleteMailboxCloture(app)(
                        conseiller._id,
                        user.name,
                      );
                    }
                  })
                  .then(async () => {
                    logger.info(
                      `Les comptes Mattermost et Gandi du conseiller (id: ${conseiller._id} ont été supprimé`,
                    );
                  });
              }
              // Mise à jour du cache Obj
              await updateCacheObj(app)(conseillerUpdated);

              // Envoi des emails de cloture de compte pour PIX / le conseiller
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
                .send(conseillerUpdated)
                .catch((errSmtp: Error) => {
                  logger.error(errSmtp);
                  Sentry.captureException(errSmtp);
                });
              if (errorSmtpMailFinContrat instanceof Error) {
                logger.error(errorSmtpMailFinContrat.message);
                Sentry.captureException(errorSmtpMailFinContrat.message);
              }
            } catch (error) {
              logger.error(error);
              Sentry.captureException(error);
            }
          } else {
            // S'il y a au moins une mise en relation (recrutee, finalisee) on vérifie si le conseiller peut conserver le flag hasPermanence
            await checkAndUpdatePermanence(app)(
              structuresIdsRecruteeEtFinalisee,
              conseiller._id,
            );
          }
          countSucess += 1;
        } else {
          countError += 1;
        }
      } else {
        countInexistant += 1;
      }
      await delay(2000);
    }
    logger.info(
      `Nous avons traité ${termineesNaturelles.length} conseillers comportant le statut terminee_naturelle. (En erreur: ${countError} / En succès: ${countSucess} / user ou conseiller inexistant: ${countInexistant})`,
    );
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }
  exit();
});
