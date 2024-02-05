#!/usr/bin/env node

// ts-node src/tools/scripts/fusion-structure-coordo.ts --structureActif XidPGX --structureDoublon XidPGX

import { program } from 'commander';
import execute from '../utils';
import service from '../../helpers/services';
import { getCoselec } from '../../utils';
import { PhaseConventionnement } from '../../ts/enum';
import { checkStructurePhase2 } from '../../services/structures/repository/structures.repository';

program.option(
  '-sa, --structureActif <structureActif>',
  "idPG de la structure qu'on conserve",
);
program.option(
  '-sd, --structureDoublon <structureDoublon>',
  'idPG de la structure doublon',
);
program.parse(process.argv);

const findStructure = (app) => async (idPG) =>
  app
    .service(service.structures)
    .Model.findOne({ idPG: Number(idPG), statut: 'VALIDATION_COSELEC' });

const misesEnRelationStructure = (app) => (structureDoublon) =>
  app.service(service.misesEnRelation).Model.find({
    'structure.$id': structureDoublon._id,
    statut: { $in: ['recrutee', 'finalisee', 'nouvelle_rupture'] },
  });

const findOneAndUpdateStructure = (app) => (structureId, query) =>
  app
    .service(service.structures)
    .Model.findOneAndUpdate(
      { _id: structureId },
      { ...query },
      { returnOriginal: false },
    );

const miseEnRelationMajCache = (app) => (structureObj: any) =>
  app
    .service(service.misesEnRelation)
    .Model.updateMany(
      { 'structure.$id': structureObj._id },
      { $set: { structureObj } },
    );
const userUpdatedStructureDoublon = (app) => async (structureDoublon) => {
  await app.service(service.users).Model.updateMany(
    {
      'entity.$id': structureDoublon._id,
    },
    {
      $pull: {
        roles: { $in: ['structure', 'structure_coop'] },
      },
    },
  );
  await app.service(service.users).Model.deleteMany({
    'entity.$id': structureDoublon._id,
    roles: { $size: 0 },
  });
};

execute(__filename, async ({ app, logger, exit }) => {
  try {
    const options = program.opts();
    if (
      Number.isNaN(Number(options.structureActif)) ||
      Number.isNaN(Number(options.structureDoublon))
    ) {
      logger.error(
        `Veuillez renseigner les idPG pour les structures à fusionner`,
      );
      return;
    }
    const structureDoublon = await findStructure(app)(options.structureDoublon);
    const structureActif = await findStructure(app)(options.structureActif);
    if (!structureActif || !structureDoublon) {
      logger.error(
        `Une structure est introuvable (structureActif: ${structureActif?.idPG}; structureDoublon: ${structureDoublon?.idPG})`,
      );
      return;
    }
    const verifContrats = await misesEnRelationStructure(app)(structureDoublon);
    if (verifContrats.length >= 1) {
      logger.error(
        `Fusion Non possible car il reste ${verifContrats.length} misesEnRelation pour la structure ${structureDoublon.idPG} `,
      );
      return;
    }
    const coselecCoordo = structureDoublon.coselec.findLast(
      (i) => i?.type === 'coordinateur',
    );
    const countCoordoAccepte = structureDoublon?.demandesCoordinateur.filter(
      (i) => i.statut === 'validee',
    );
    if (countCoordoAccepte.length === 0 && !coselecCoordo) {
      logger.error(
        `La structure ${structureDoublon.idPG} a 0 poste coordo attribué !`,
      );
      return;
    }
    const structureAConserver = await findOneAndUpdateStructure(app)(
      structureActif._id,
      {
        $push: {
          ...(coselecCoordo && {
            coselec: {
              nombreConseillersCoselec:
                getCoselec(structureActif).nombreConseillersCoselec +
                countCoordoAccepte.length,
              avisCoselec: 'POSITIF',
              insertedAt: coselecCoordo.insertedAt,
              type: 'coordinateur',
              ...(checkStructurePhase2(
                structureActif?.conventionnement?.statut,
              ) && {
                phaseConventionnement: PhaseConventionnement.PHASE_2,
              }),
            },
          }),
          demandesCoordinateur: {
            $each: structureDoublon.demandesCoordinateur,
          },
        },
      },
    );
    const structureDoublonSuiteFusion = await findOneAndUpdateStructure(app)(
      structureDoublon._id,
      {
        $set: { statut: 'ABANDON', userCreated: false },
        $push: {
          coselec: {
            nombreConseillersCoselec: 0,
            avisCoselec: 'POSITIF',
            insertedAt: new Date(),
          },
        },
        $unset: { demandesCoordinateur: '' },
      },
    );
    await userUpdatedStructureDoublon(app)(structureDoublon);
    await miseEnRelationMajCache(app)(structureAConserver); // A check delta de 1
    await miseEnRelationMajCache(app)(structureDoublonSuiteFusion);
    logger.info(
      `Structure ${options.structureActif} passe de ${
        getCoselec(structureActif).nombreConseillersCoselec
      } poste(s) à ${
        getCoselec(structureAConserver).nombreConseillersCoselec
      } dont ${countCoordoAccepte.length} poste(s) coordo`,
    );
    logger.info(
      `Structure ${options.structureDoublon} passe de ${
        getCoselec(structureDoublon).nombreConseillersCoselec
      } poste(s) dont ${countCoordoAccepte.length} poste(s) coordo à ${
        getCoselec(structureDoublonSuiteFusion).nombreConseillersCoselec
      } poste (ABANDON)`,
    );
  } catch (error) {
    logger.error(error);
  }
  exit();
});
