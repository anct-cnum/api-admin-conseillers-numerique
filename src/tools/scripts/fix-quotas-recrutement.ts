#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/scripts/fix-quotas-recrutement.ts

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { getCoselec } from '../../utils';

const path = require('path');
const fs = require('fs');

program.option(
  '-f, --fix',
  'fix: mise à jour des mises en relation en statut interessee',
);
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const options = program.opts();
    const structures = await app.service(service.structures).Model.find({
      statut: 'VALIDATION_COSELEC',
    });
    const fixQuota = options.fix;
    const promises: Promise<void>[] = [];
    const csvFile = path.join(__dirname, '../../../datas', `structures.csv`);
    const file = fs.createWriteStream(csvFile, { flags: 'w' });
    file.write(
      'ID;Nom;Téléphone;Email;Conseillers recrutés;Attribution COSELEC\n',
    );
    await structures.forEach(async (structure) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve, reject) => {
        const coselec = getCoselec(structure);
        const misesEnRelation = await app
          .service(service.misesEnRelation)
          .Model.find({
            'structure.$id': structure._id,
            statut: { $in: ['recrutee', 'finalisee'] },
          });
        if (!misesEnRelation) {
          reject();
        }
        if (
          coselec?.nombreConseillersCoselec < misesEnRelation.length &&
          coselec?.nombreConseillersCoselec > 0
        ) {
          file.write(
            `${structure.idPG};${structure.nom};${structure?.contact?.telephone};${structure?.contact?.email};${misesEnRelation.length};${coselec?.nombreConseillersCoselec}\n`,
          );
          if (fixQuota) {
            const misesEnRelationUpdated = misesEnRelation.filter(
              (miseEnRelation) => miseEnRelation.statut === 'recrutee',
            );
            await app.service(service.misesEnRelation).Model.updateMany(
              {
                _id: {
                  $in: misesEnRelationUpdated.map(
                    (miseEnRelation) => miseEnRelation._id,
                  ),
                },
              },
              {
                $set: {
                  statut: 'interessee',
                },
                $unset: {
                  emetteurRecrutement: '',
                  dateRecrutement: '',
                  typeDeContrat: '',
                  dateDebutDeContrat: '',
                  dateFinDeContrat: '',
                },
              },
            );
          }
        }
        resolve(p);
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    exit(0, 'Migration terminée');
  } catch (e) {
    logger.error(e);
  }
  exit(0, 'Migration terminée');
});
