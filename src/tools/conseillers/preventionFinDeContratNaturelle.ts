#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/preventionFinDeContratNaturelle.ts -f

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import mailer from '../../mailer';
import service from '../../helpers/services';
import {
  getConseiller,
  updateCacheObj,
} from '../../utils/functionsDeleteRoleConseiller';
import {
  preventionSuppressionConseiller,
  prenventionSuppressionConseillerStructure,
} from '../../emails';

const getMisesEnRelationsFinContrat = (app) => async (dateDuJourFin) =>
  app.service(service.misesEnRelation).Model.find({
    dateFinDeContrat: { $lte: dateDuJourFin },
    statut: 'finalisee',
    typeDeContrat: { $ne: 'CDI' },
    reconventionnement: { $ne: true },
  });

// insertion du nouveau flag dans le statut afin de gérer les cas de fin de contrat naturelle
// statut créer pour identifer les contrats terminés mais qui ont toujours accès aux outils Conum
// avant de les passer en terminer à M+2 de la fin de contrat
const updateMiseEnRelation = (app) => async (id) =>
  app.service(service.misesEnRelation).Model.findOneAndUpdate(
    {
      _id: id,
    },
    {
      $set: {
        statut: 'terminee_naturelle',
      },
    },
    {
      new: true,
    },
  );

const updateConseiller = (app) => async (idConseiller) =>
  app.service(service.conseillers).Model.findOneAndUpdate(
    {
      _id: idConseiller,
    },
    {
      $set: {
        statut: 'TERMINE',
      },
    },
    {
      new: true,
    },
  );

const getEmailsStructure = (app) => async (conseiller) => {
  const emailsStructure = [];
  const usersStructure = await app.service(service.users).Model.find({
    'entity.$id': conseiller.structureId,
    roles: { $in: ['structure'] },
  });
  for (const userStructure of usersStructure) {
    if (!emailsStructure.includes(userStructure?.name)) {
      emailsStructure.push(userStructure.name);
    }
  }
  if (!emailsStructure.includes(conseiller?.supHierarchique?.email)) {
    emailsStructure.push(conseiller.supHierarchique.email);
  }
  return emailsStructure;
};

const createConseillersTermines =
  (app) => async (conseiller, miseEnRelationIdTerminee) => {
    const miseEnRelation = await app
      .service(service.misesEnRelation)
      .Model.findOne({
        _id: miseEnRelationIdTerminee._id,
      });
    await app.service(service.conseillersTermines).Model.create({
      conseillerId: conseiller._id,
      structureId: conseiller.structureId,
      typeDeContrat: miseEnRelation.typeDeContrat,
      dateDebutDeContrat: miseEnRelation.dateDebutDeContrat,
      dateFinDeContrat: miseEnRelation.dateFinDeContrat,
      phaseConventionnement: miseEnRelation?.phaseConventionnement ?? null,
      reconventionnement: miseEnRelation?.reconventionnement ?? false,
    });
  };

program
  .option(
    '-f, --fix',
    'fix: mise à jour des mises en relation en statut terminee_naturelle',
  )
  .option(
    '-ee, --envoiEmail',
    'envoiEmail: Envoyer les emails de prévention de suppression',
  )
  .parse(process.argv);

execute(__filename, async ({ app, logger, exit, delay, Sentry }) => {
  try {
    const options = program.opts();
    const dateDuJour = new Date();
    const { fix, envoiEmail } = options;

    const misesEnRelationsFinContrat = await getMisesEnRelationsFinContrat(app)(
      dayjs(dateDuJour).startOf('date').toDate(),
    );

    if (misesEnRelationsFinContrat.length === 0) {
      logger.info(`Fin de contrat naturel : aucun contrat en cours à terminer`);
      exit();
      return;
    }
    logger.info(
      `Il y a ${misesEnRelationsFinContrat.length} contrat(s) encore en cours dont la date de fin de contrat est dépassée.`,
    );
    for (const miseEnRelationFinContrat of misesEnRelationsFinContrat) {
      const conseiller = await getConseiller(app)(
        miseEnRelationFinContrat.conseiller.oid,
      );
      logger.info(
        // eslint-disable-next-line
        `Le conseiller (idPG: ${conseiller.idPG}) possède un contrat en cours dont la date de fin de contrat est au ${dayjs(miseEnRelationFinContrat.dateFinDeContrat).format('DD-MM-YYYY')}.`,
      );

      if (fix) {
        const conseillerUpdated = await updateConseiller(app)(conseiller._id);
        logger.info(
          `Le conseiller a été passé en statut 'TERMINE' (id: ${conseiller._id})`,
        );
        await updateMiseEnRelation(app)(miseEnRelationFinContrat._id).then(
          async () => {
            logger.info(
              `Le conseiller (idPG: ${
                conseiller.idPG
              }) passe en fin de contrat naturelle - date de fin de contrat est au ${dayjs(
                miseEnRelationFinContrat.dateFinDeContrat,
              ).format('DD-MM-YYYY')}`,
            );
          },
        );

        await updateCacheObj(app)(conseillerUpdated);

        // Historisation du conseiller terminé
        await createConseillersTermines(app)(
          conseillerUpdated,
          miseEnRelationFinContrat,
        );

        // Envoie de mail conseiller et structure
        if (envoiEmail) {
          const mailerInstance = mailer(app);
          const messagePreventionFinContrat =
            preventionSuppressionConseiller(mailerInstance);
          const errorSmtpMailPreventionFinContratNaturelle =
            await messagePreventionFinContrat
              .send(conseiller)
              .catch((errSmtp: Error) => {
                logger.error(errSmtp);
                Sentry.captureException(errSmtp);
              });
          if (errorSmtpMailPreventionFinContratNaturelle instanceof Error) {
            logger.error(errorSmtpMailPreventionFinContratNaturelle.message);
            Sentry.captureException(
              errorSmtpMailPreventionFinContratNaturelle.message,
            );
          }

          const messagePreventionFinContratStructure =
            prenventionSuppressionConseillerStructure(mailerInstance);
          const emailsStructure = await getEmailsStructure(app)(conseiller);
          for (const emailStructure of emailsStructure) {
            const errorSmtpMailPreventionFinContratStructure =
              await messagePreventionFinContratStructure
                .send(
                  conseiller.idPG,
                  miseEnRelationFinContrat.structureObj.idPG,
                  emailStructure,
                )
                .catch((errSmtp: Error) => {
                  logger.error(errSmtp);
                  Sentry.captureException(errSmtp);
                });
            if (errorSmtpMailPreventionFinContratStructure instanceof Error) {
              logger.error(errorSmtpMailPreventionFinContratStructure.message);
              Sentry.captureException(
                errorSmtpMailPreventionFinContratStructure.message,
              );
            }
          }
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
