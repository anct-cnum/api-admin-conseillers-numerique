#!/usr/bin/env node
/* eslint-disable no-await-in-loop */

// Lancement de ce script : ts-node src/tools/populate/populate-dates-contrats.ts -c <path file>

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const contrats = await CSVToJSON({ delimiter: 'auto', trim: true }).fromFile(filePath); // CSV en entrée

  return contrats;
};

execute(__filename, async ({ app, logger, exit }) => {
  const matchContrat = (idStructure: number, idConseiller: number) => app
    .service(service.misesEnRelation)
    .Model
    .findOne({
      'structureObj.idPG': idStructure,
      'conseillerObj.idPG': idConseiller,
      statut: { $in: ['finalisee', 'nouvelle_rupture', 'finalisee_rupture'] },
    });

  const options = program.opts();
  const contrats = await readCSV(options.csv);

  const promises: Promise<void>[] = [];

  let trouvees = 0;
  let inconnues = 0;

  contrats.forEach(async (contrat) => {
    // eslint-disable-next-line no-async-promise-executor
    const p = new Promise<void>(async (resolve, reject) => {
      const match = await matchContrat(parseInt(contrat['ID SA'], 10), parseInt(contrat['ID CNFS'], 10));

      if (match === null) {
        inconnues++;
        logger.warn(`Contrat inexistant pour structure ${contrat['ID SA']} et conseiller ${contrat['ID CNFS']}`);
        reject();
      } else {
        trouvees++;
        const [jourDebut, moisDebut, anneeDebut] = contrat['Date de début de CT\nJJ/MM/AAAA'].split("/");
        const dateDebutObject = new Date(anneeDebut, moisDebut - 1, jourDebut, 0, 0, 0);
        const [jourFin, moisFin, anneeFin] = contrat['Date de fin de CT\nJJ/MM/AAAA'].split("/");
        const dateFinObject = new Date(anneeFin, moisFin - 1, jourFin, 0, 0, 0);

        const c = await app.service(service.misesEnRelation).Model.findOneAndUpdate(
          { _id: match._id },
          { $set: {
            dateDebutDeContrat: dateDebutObject,
            dateFinDeContrat: dateFinObject,
            typeDeContrat: contrat['CT dans BDD'],
            dureeEffectiveContrat: contrat['Durée effective \n(mois)'],
            numeroDSContrat: contrat['N°DS'],
          } },
          { returnOriginal: false },
        );
        logger.info(`Contrat mis à jour pour structure ${contrat['ID SA']} et conseiller ${contrat['ID CNFS']}`);
        logger.info(match._id);
        resolve(p);
      }
    });
    promises.push(p);
  });
  await Promise.allSettled(promises);
  logger.info(`${contrats.length} contrats`);
  logger.info(`${inconnues} inconnues`);
  logger.info(`${trouvees} trouvées`);
  exit(0, 'Migration terminée');
});
