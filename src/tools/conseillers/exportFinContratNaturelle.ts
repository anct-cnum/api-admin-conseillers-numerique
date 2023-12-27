#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/conseillers/exportFinContratNaturelle.ts

import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';

const path = require('path');
const fs = require('fs');

const getFinsDeContratNaturelles = async (app) =>
  app
    .service(service.misesEnRelation)
    .Model.find({
      dateFinDeContrat: { $lte: new Date('2024-01-31') },
      statut: 'finalisee',
      typeDeContrat: { $ne: 'CDI' },
    })
    .sort({
      dateFinDeContrat: 1,
    });

const getUserStructure = (app) => async (idStructure) =>
  app.service(service.users).Model.find({
    'entity.$id': idStructure,
    roles: {
      $in: ['structure'],
    },
  });

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const finsDeContratNaturelles = await getFinsDeContratNaturelles(app);
    const csvFile = path.join(
      __dirname,
      '../../../datas/exports',
      `finContratNaturelle.csv`,
    );
    const file = fs.createWriteStream(csvFile, {
      flags: 'w',
    });

    logger.info(
      `${finsDeContratNaturelles.length} contrats sont concernés par une fin naturelle jusqu'au 15 janvier 2024`,
    );

    file.write(
      'Id CNFS;Nom;Prénom;Email;Id Structure;Nom de la structure;Contact principal;Autres administrateur;Date de début de contrat;Date de fin de contrat;\n',
    );
    for (const finDeContrat of finsDeContratNaturelles) {
      const conseiller = finDeContrat.conseillerObj;
      const structure = finDeContrat.structureObj;
      const usersStructureEmail = await getUserStructure(app)(
        finDeContrat.structure.oid,
      );
      const tabEmails = [];
      for (const user of usersStructureEmail) {
        if (user.name !== structure.contact.email) {
          tabEmails.push(user.name);
        }
      }
      const dateDebutDeContrat = dayjs(
        new Date(finDeContrat.dateDebutDeContrat),
      ).format('DD/MM/YYYY');
      const dateFinDeContrat = dayjs(
        new Date(finDeContrat.dateFinDeContrat),
      ).format('DD/MM/YYYY');

      file.write(
        // eslint-disable-next-line
        `${conseiller.idPG};${conseiller.nom};${conseiller.prenom};${conseiller.email};${structure.idPG};${structure.nom};${structure.contact.email};${String(tabEmails)};${dateDebutDeContrat};${dateFinDeContrat}\n`,
      );
    }
    file.close();
  } catch (error) {
    logger.error(error);
  }
  exit();
});
