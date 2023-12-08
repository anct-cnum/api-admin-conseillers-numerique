#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/finDeContratNaturelle.ts

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import mailer from '../../mailer';
import service from '../../helpers/services';
import { updateConseillersPG } from '../../utils/functionsDeleteConseiller';
import { conseillerFinContratNaturelle } from '../../emails';

const { Pool } = require('pg');

const getMisesEnRelationsFinContrat = (app) => async (dateDuJour) =>
  app.service(service.misesEnRelation).Model.find({
    dateFinDeContrat: { $lte: dateDuJour },
    statut: 'finalisee',
    typeDeContrat: { $ne: 'CDI' },
  });
// insertion du nouveau flag dans le statut afin de gérer les cas de fin de contrat naturelle
// statut créer pour identifer les contrats terminés mais qui ont toujours accès aux outils Conum
// avant de les passer en terminer à M+2 de la fin de contrat
const updateMiseEnRelation = (app) => async (id, updatedAt) =>
  app.service(service.misesEnRelation).Model.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        statut: 'terminee_naturelle',
        'conseillerObj.statut': 'TERMINE',
        'conseillerObj.disponible': true,
        'conseillerObj.nonAffichageCarto': true,
        'conseillerObj.updatedAt': updatedAt,
      },
    },
  );

const updateConseillerDisponibilite = (app) => async (email, updatedAt) =>
  app.service(service.conseillers).Model.updateOne(
    {
      email,
    },
    {
      $set: {
        disponible: true,
        dateDisponibilite: updatedAt,
        updatedAt,
      },
    },
  );
const updateConseiller = (app) => async (idConseiller, updatedAt) =>
  app.service(service.conseillers).Model.updateOne(
    {
      id: idConseiller,
    },
    {
      $set: {
        statut: 'TERMINE',
        nonAffichageCarto: true,
        updatedAt,
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
    const dateDuJour = new Date();
    const { fix } = options;

    logger.info(
      'Recherche des contrats encore en cours alors que la date de fin de contrat est passée.',
    );

    const misesEnRelationsFinContrat = await getMisesEnRelationsFinContrat(app)(
      dateDuJour,
    );

    if (misesEnRelationsFinContrat.length === 0) {
      logger.info(`Aucun contrat n'a été trouvé`);
      exit();
      return;
    }
    logger.info(
      `Il y a ${misesEnRelationsFinContrat.length} contrat(s) encore en cours dont la date de fin de contrat est dépassée.`,
    );
    for (const miseEnRelationFinContrat of misesEnRelationsFinContrat) {
      logger.info(
        // eslint-disable-next-line
        `Le conseiller (idPG: ${miseEnRelationFinContrat.conseillerObj.idPG}) possède un contrat en cours dont la date de fin de contrat est au ${dayjs(miseEnRelationFinContrat.dateFinDeContrat).format('DD-MM-YYYY')}.`,
      );

      if (fix) {
        await updateConseiller(app)(
          miseEnRelationFinContrat.conseiller.oid,
          dateDuJour,
        ).then(async () => {
          logger.info(
            `Le conseiller a été passée en statut 'TERMINE' (id: ${miseEnRelationFinContrat.conseiller.oid})`,
          );
          const pool = new Pool();
          const datePG = dayjs(dateDuJour).format('YYYY-MM-DD');
          await updateConseillersPG(pool)(
            miseEnRelationFinContrat.conseillerObj.email,
            true,
            datePG,
          );
          await updateConseillerDisponibilite(app)(
            miseEnRelationFinContrat.conseillerObj.email,
            dateDuJour,
          );
        });
        await updateMiseEnRelation(app)(
          miseEnRelationFinContrat._id,
          dateDuJour,
        ).then(async () => {
          logger.info(
            `La mise en relation a été passée en statut 'terminee_naturelle' (id: ${miseEnRelationFinContrat._id})`,
          );
        });
        // Envoie de mail conseiller
        const mailerInstance = mailer(app);
        const messageFinContrat = conseillerFinContratNaturelle(mailerInstance);
        const errorSmtpMailFinContratPix = await messageFinContrat
          .send(miseEnRelationFinContrat.conseillerObj)
          .catch((errSmtp: Error) => {
            logger.error(errSmtp);
          });
        if (errorSmtpMailFinContratPix instanceof Error) {
          logger.error(errorSmtpMailFinContratPix.message);
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }

  exit();
});
