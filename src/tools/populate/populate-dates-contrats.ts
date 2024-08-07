#!/usr/bin/env node

// Lancement de ce script : ts-node src/tools/populate/populate-dates-contrats.ts -c <path file> (-d)

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';

program.option('-c, --csv <path>', 'CSV file path');
program.option('-d, --delete', 'clean miseEnRelation collection ');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const contrats = await CSVToJSON({ delimiter: 'auto', trim: true }).fromFile(
    filePath,
  ); // CSV en entrée

  return contrats;
};

execute(__filename, async ({ app, logger, exit }) => {
  const matchContrat = (idStructure: number, idConseiller: number) =>
    app.service(service.misesEnRelation).Model.findOne({
      'structureObj.idPG': idStructure,
      'conseillerObj.idPG': idConseiller,
      statut: {
        $in: ['finalisee', 'nouvelle_rupture', 'finalisee_rupture', 'terminee'],
      },
      phaseConventionnement: { $exists: false },
    });
  const cleanMiseEnRelation = () =>
    app.service(service.misesEnRelation).Model.updateMany(
      {
        $or: [
          {
            dureeEffectiveContrat: {
              $exists: true,
            },
          },
          {
            numeroDSContrat: {
              $exists: true,
            },
          },
        ],
      },
      {
        $unset: {
          dureeEffectiveContrat: '',
          numeroDSContrat: '',
        },
      },
    );
  const options = program.opts();
  const contrats = await readCSV(options.csv);

  const promises: Promise<void>[] = [];

  let trouvees = 0;
  let inconnues = 0;
  if (!options.delete) {
    contrats.forEach(async (contrat) => {
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve, reject) => {
        const match = await matchContrat(
          parseInt(contrat['ID SA'], 10),
          parseInt(contrat['ID CNFS'], 10),
        );

        if (match === null) {
          inconnues += 1;
          logger.warn(
            `Contrat inexistant pour la structure ${contrat['ID SA']} et le conseiller ${contrat['ID CNFS']}`,
          );
          reject();
        } else {
          trouvees += 1;
          if (contrat['Date de début de CT JJ/MM/AAAA'].trim().length === 0) {
            logger.error(
              `Date de début manquante pour le contrat entre le conseiller ${contrat['ID CNFS']} et la structure ${contrat['ID SA']}`,
            );
            reject();
          } else if (
            contrat['Date de fin de CT JJ/MM/AAAA'].trim().length === 0 &&
            contrat['CT V1'] !== 'CDI'
          ) {
            logger.error(
              `Date de fin manquante pour le contrat entre le conseiller ${contrat['ID CNFS']} et la structure ${contrat['ID SA']}`,
            );
            reject();
          } else {
            const [jourDebut, moisDebut, anneeDebut] =
              contrat['Date de début de CT JJ/MM/AAAA'].split('/');
            const dateDebutObject = new Date(
              anneeDebut,
              moisDebut - 1,
              jourDebut,
              0,
              0,
              0,
            );
            if (
              new Date() < dateDebutObject ||
              dateDebutObject < new Date('2020-10-01')
            ) {
              logger.error(
                `Date de début incorrecte pour le contrat entre le conseiller ${contrat['ID CNFS']} et la structure ${contrat['ID SA']}`,
              );
              reject();
            }

            const [jourFin, moisFin, anneeFin] =
              contrat['Date de fin de CT JJ/MM/AAAA'].split('/');
            const dateFinObject = new Date(
              anneeFin,
              moisFin - 1,
              jourFin,
              0,
              0,
              0,
            );
            if (
              dateFinObject < new Date('2020-10-01') &&
              contrat['CT V1'] !== 'CDI'
            ) {
              logger.error(
                `Date de fin incorrecte pour le contrat entre le conseiller ${contrat['ID CNFS']} et la structure ${contrat['ID SA']}`,
              );
              reject();
            }
            if (
              new Date(dateDebutObject).toString() !== 'Invalid Date' &&
              new Date(dateFinObject).toString() !== 'Invalid Date'
            ) {
              await app.service(service.misesEnRelation).Model.updateOne(
                { _id: match._id },
                {
                  $set: {
                    dateDebutDeContrat: dateDebutObject,
                    ...(contrat['CT V1'] !== 'CDI'
                      ? { dateFinDeContrat: dateFinObject }
                      : {}),
                    typeDeContrat: contrat['CT V1'],
                  },
                },
              );
              logger.info(
                `Contrat mis à jour pour structure ${contrat['ID SA']} et conseiller ${contrat['ID CNFS']} (${match._id})`,
              );
            }
          }
          resolve(p);
        }
      });
      promises.push(p);
    });
    await Promise.allSettled(promises);
    logger.info(`${contrats.length} contrats`);
    logger.info(`${inconnues} inconnues`);
    logger.info(`${trouvees} trouvées`);
  }
  if (options.delete) {
    await cleanMiseEnRelation();
  }
  exit(0, 'Migration terminée');
});
