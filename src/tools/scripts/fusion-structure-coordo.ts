#!/usr/bin/env node

// ts-node src/tools/scripts/fusion-structure-coordo.ts --structureActif XidPGX --structureDoublon XidPGX

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';
import { getCoselec } from '../../utils';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';

const { Pool } = require('pg');

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

const updateStructurePG = (pool) => async (idPG, datePG) =>
  pool.query(
    `
          UPDATE djapp_hostorganization
          SET updated = $2
          WHERE id = $1`,
    [idPG, datePG],
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
    const pool = new Pool();
    const today = new Date();

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
    const coselecCoordo = structureDoublon.coselec.filter(
      (i) => i?.type === 'coordinateur',
    );
    const countCoordoAccepte = structureDoublon?.demandesCoordinateur.filter(
      (demandeCoordinateur) => demandeCoordinateur.statut === 'validee',
    );

    if (countCoordoAccepte.length === 0) {
      logger.error(
        `La structure ${structureDoublon.idPG} a 0 poste coordo attribué !`,
      );
      return;
    }
    await updateStructurePG(pool)(
      structureActif.idPG,
      dayjs(structureDoublon.updatedAt).format('YYYY-MM-DD'),
    );

    const structureAConserver = await app
      .service(service.structures)
      .Model.findOneAndUpdate(
        { _id: structureActif._id },
        {
          $set: {
            updatedAt: structureDoublon.updatedAt,
          },
          $push: {
            ...(coselecCoordo.length > 0 && {
              coselec: {
                nombreConseillersCoselec:
                  getCoselec(structureActif).nombreConseillersCoselec +
                  coselecCoordo.length,
                avisCoselec: 'POSITIF',
                insertedAt: today,
                type: 'coordinateur',
                ...(structureActif?.conventionnement?.statut ===
                  StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2 && {
                  phaseConventionnement: PhaseConventionnement.PHASE_2,
                }),
              },
            }),
            demandesCoordinateur: {
              $each: structureDoublon.demandesCoordinateur,
            },
          },
        },
        { returnOriginal: false, includeResultMetadata: true },
      );
    if (structureAConserver.lastErrorObject.n === 0) {
      logger.error(
        `La structure ${structureActif.idPG} n'a pas été mise à jour!`,
      );
      return;
    }
    await updateStructurePG(pool)(
      structureDoublon.idPG,
      dayjs(today).format('YYYY-MM-DD'),
    );
    const structureDoublonSuiteFusion = await app
      .service(service.structures)
      .Model.findOneAndUpdate(
        { _id: structureDoublon._id },
        {
          $set: {
            statut: 'ABANDON',
            userCreated: false,
            updatedAt: today,
          },
          $push: {
            coselec: {
              nombreConseillersCoselec: 0,
              avisCoselec: 'POSITIF',
              insertedAt: today,
            },
          },
          $unset: { demandesCoordinateur: '' },
        },
        { returnOriginal: false, includeResultMetadata: true },
      );
    if (structureDoublonSuiteFusion.lastErrorObject.n === 0) {
      logger.error(
        `La structure ${structureDoublon.idPG} n'a pas été mise à jour!`,
      );
      return;
    }
    await userUpdatedStructureDoublon(app)(structureDoublon);
    await miseEnRelationMajCache(app)(structureAConserver.value);
    await miseEnRelationMajCache(app)(structureDoublonSuiteFusion.value);
    logger.info(
      `Structure ${options.structureActif} passe de ${
        getCoselec(structureActif).nombreConseillersCoselec
      } poste(s) à ${
        getCoselec(structureAConserver.value).nombreConseillersCoselec
      } dont ${countCoordoAccepte.length} poste(s) coordo`,
    );
    logger.info(
      `Structure ${options.structureDoublon} passe de ${
        getCoselec(structureDoublon).nombreConseillersCoselec
      } poste(s) dont ${countCoordoAccepte.length} poste(s) coordo à ${
        getCoselec(structureDoublonSuiteFusion.value).nombreConseillersCoselec
      } poste (ABANDON)`,
    );
  } catch (error) {
    logger.error(error);
  }
  exit();
});
