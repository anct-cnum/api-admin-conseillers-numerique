#!/usr/bin/env node

import CSVToJSON from 'csvtojson';
import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';

// Lancement de ce script : node_modules/.bin/ts-node src/tools/populate/populate-dates-contrats-v2.ts -c file

program.option('-c, --csv <path>', 'CSV file path');
program.parse(process.argv);

const readCSV = async (filePath: any) => {
  const contrats = await CSVToJSON({ delimiter: 'auto', trim: true }).fromFile(
    filePath,
  );

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
      reconventionnement: true,
    });

  const options = program.opts();
  const contrats = await readCSV(options.csv);

  let trouvees = 0;
  let inconnues = 0;
  let nonEligibles = 0;
  let successCount = 0;

  for (const contrat of contrats) {
    try {
      if (
        !['CDI', 'CDP', 'CDD', 'Contrat de projet'].includes(contrat['Type CT'])
      ) {
        logger.error(
          `${contrat['Type CT'] ?? null} non autorisé - CN: ${contrat['ID CN']} et SA: ${contrat['ID SA']}`,
        );
        nonEligibles += 1;
        // eslint-disable-next-line no-continue
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const match = await matchContrat(
        parseInt(contrat['ID SA'], 10),
        parseInt(contrat['ID CN'], 10),
      );

      if (match === null) {
        inconnues += 1;
        logger.warn(
          `Contrat inexistant pour la structure ${contrat['ID SA']} et le conseiller ${contrat['ID CN']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }
      if (match.statut !== 'finalisee') {
        nonEligibles += 1;
        logger.warn(
          `Contrat en ${match.statut} pour la structure ${contrat['ID SA']} et le conseiller ${contrat['ID CN']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }
      if (match.miseEnRelationReconventionnement) {
        nonEligibles += 1;
        logger.warn(
          `Le contrat entre la structure ${contrat['ID SA']} et le conseiller ${contrat['ID CN']} a déjà été renouvelé.`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }
      if (match.structureObj.statut !== 'VALIDATION_COSELEC') {
        nonEligibles += 1;
        logger.warn(
          `La structure ${contrat['ID SA']} pour le conseiller ${contrat['ID CN']} est en statut ${match.structureObj.statut}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }
      if (
        ![
          StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ,
          StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
        ].includes(match.structureObj.conventionnement?.statut)
      ) {
        nonEligibles += 1;
        logger.warn(
          `La structure ${contrat['ID SA']} pour le conseiller ${contrat['ID CN']} n'a pas reconventionné (statut actuel : ${match.structureObj.conventionnement?.statut})`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      trouvees += 1;

      if (contrat['Debut V2'].trim().length === 0) {
        logger.error(
          `Date de début manquante pour le contrat entre le conseiller ${contrat['ID CN']} et la structure ${contrat['ID SA']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }
      if (
        contrat['Fin V2'].trim().length === 0 &&
        contrat['Type CT'] !== 'CDI'
      ) {
        logger.error(
          `Date de fin manquante pour le contrat entre le conseiller ${contrat['ID CN']} et la structure ${contrat['ID SA']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      const [jourDebut, moisDebut, anneeDebut] = contrat['Debut V2'].split('/');
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
          `Date de début incorrecte pour le contrat entre le conseiller ${contrat['ID CN']} et la structure ${contrat['ID SA']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      const [jourFin, moisFin, anneeFin] = contrat['Fin V2'].split('/');
      const dateFinObject = new Date(anneeFin, moisFin - 1, jourFin, 0, 0, 0);

      if (
        dateFinObject < new Date('2020-10-01') &&
        contrat['Type CT'] !== 'CDI'
      ) {
        logger.error(
          `Date de fin incorrecte pour le contrat entre le conseiller ${contrat['ID CN']} et la structure ${contrat['ID SA']}`,
        );
        // eslint-disable-next-line no-continue
        continue;
      }

      if (
        new Date(dateDebutObject).toString() !== 'Invalid Date' &&
        new Date(dateFinObject).toString() !== 'Invalid Date'
      ) {
        const {
          _id: id,
          reconventionnement,
          ...nouvelleMisesEnRelation
        } = match._doc;

        // eslint-disable-next-line no-await-in-loop
        const result = await app.service(service.misesEnRelation).Model.create({
          ...nouvelleMisesEnRelation,
          statut: 'finalisee',
          dateDebutDeContrat: dateDebutObject,
          ...(contrat['Type CT'] !== 'CDI'
            ? { dateFinDeContrat: dateFinObject }
            : {}),
          typeDeContrat:
            contrat['Type CT'] === 'CDP'
              ? 'Contrat de projet'
              : contrat['Type CT'],
          banniereValidationRenouvellement: true,
          miseEnRelationConventionnement: match._id,
          phaseConventionnement: PhaseConventionnement.PHASE_2,
          createdAt: new Date(),
          emetteurRenouvellement: {
            date: new Date(),
            email: app.get('user_support'),
          },
        });

        // eslint-disable-next-line no-await-in-loop
        await app.service(service.misesEnRelation).Model.updateOne(
          { _id: match._id },
          {
            $set: {
              statut: 'terminee',
              miseEnRelationReconventionnement: result._id,
            },
          },
        );

        logger.info(
          `Importation contrat V2 du conseiller ${contrat['ID CN']} (SA : ${contrat['ID SA']})`,
        );

        successCount += 1;
      }
    } catch (error) {
      logger.error(
        `Erreur lors du traitement du contrat CN: ${contrat['ID CN']}, SA: ${contrat['ID SA']}:`,
        error,
      );
    }
  }

  logger.info(
    `${successCount} contrats importés avec succès / ${contrats.length}`,
  );
  logger.info(`${inconnues} inconnues`);
  logger.info(`${trouvees} trouvées`);
  logger.info(`${nonEligibles} non éligibles`);

  exit(0, 'Date de contrat en V2 FINI');
});
