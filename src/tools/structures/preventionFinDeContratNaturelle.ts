#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/structures/preventionFinDeContratNaturelle.ts

import dayjs from 'dayjs';
import execute from '../utils';
import mailer from '../../mailer';
import service from '../../helpers/services';
import { getConseiller } from '../../utils/functionsDeleteRoleConseiller';
import { prenventionSuppressionConseillerStructure } from '../../emails';

const getMisesEnRelationsFinContrat =
  (app) => async (dateFinDeContratDebut, dateFinDeContratFin) =>
    app.service(service.misesEnRelation).Model.find({
      dateFinDeContrat: {
        $gte: dateFinDeContratDebut,
        $lte: dateFinDeContratFin,
      },
      statut: 'finalisee',
      typeDeContrat: { $ne: 'CDI' },
      reconventionnement: { $ne: true },
    });

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
  if (
    conseiller?.supHierarchique &&
    !emailsStructure.includes(conseiller?.supHierarchique?.email)
  ) {
    emailsStructure.push(conseiller.supHierarchique.email);
  }
  return emailsStructure;
};

execute(__filename, async ({ app, logger, exit, delay, Sentry }) => {
  try {
    const dateDuJour = new Date();
    const datePlus2Mois = dayjs(dateDuJour).add(2, 'month');
    const datePlus2MoisDebut = dayjs(datePlus2Mois).startOf('date').toDate();
    const datePlus2MoisFin = dayjs(datePlus2Mois).endOf('date').toDate();
    const misesEnRelationsFinContrat = await getMisesEnRelationsFinContrat(app)(
      datePlus2MoisDebut,
      datePlus2MoisFin,
    );

    if (misesEnRelationsFinContrat.length === 0) {
      logger.info(
        `Fin naturelle de contrat : aucun contrat en cours ne se termine dans deux mois`,
      );
      exit();
      return;
    }

    logger.info(
      `Il y a ${misesEnRelationsFinContrat.length} contrat(s) en cours dont la date de fin de contrat est à venir dans deux mois.`,
    );
    for (const miseEnRelationFinContrat of misesEnRelationsFinContrat) {
      const conseiller = await getConseiller(app)(
        miseEnRelationFinContrat.conseiller.oid,
      );
      logger.info(
        // eslint-disable-next-line
        `Le conseiller (idPG: ${conseiller.idPG}) possède un contrat en cours dont la date de fin de contrat est au ${dayjs(miseEnRelationFinContrat.dateFinDeContrat).format('DD-MM-YYYY')}.`,
      );

      // Envoie de mail structure pour prévenir d'une fin de contrat dans deux mois
      const mailerInstance = mailer(app);
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
              dayjs(miseEnRelationFinContrat.dateFinDeContrat).format(
                'DD/MM/YYYY',
              ),
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
      await delay(2000);
    }
  } catch (error) {
    logger.error(error);
    Sentry.captureException(error);
  }

  exit();
});
