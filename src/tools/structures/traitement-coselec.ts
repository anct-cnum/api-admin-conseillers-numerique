#!/usr/bin/env node

// ts-node src/tools/structures/traitement-coselec.ts -id XXX -q XXX -nc XXX -fs XXX

import { program } from 'commander';
import dayjs from 'dayjs';
import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import { checkStructurePhase2 } from '../../services/structures/repository/structures.repository';
import { getCoselec } from '../../utils';

const { Pool } = require('pg');

program.option('-id, --idPG <idPG>', 'idPG de la structure');
program.option('-q, --quota <quota>', 'quota');
program.option('-nc, --numeroCoselec <numeroCoselec>', 'numero COSELEC');
program.option('-fs, --franceService <franceService>', 'label France Service');
program.option(
  '-st, --statut <statut>',
  'nouveau statut de la structure (ANNULEE, ABANDON)',
);
program.parse(process.argv);

const updateStructurePG = (pool) => async (idPG: number, datePG: string) => {
  try {
    await pool.query(
      `
      UPDATE djapp_hostorganization
      SET updated = $2
      WHERE id = $1`,
      [idPG, datePG],
    );
  } catch (error) {
    throw new Error(error);
  }
};

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();
  const pool = new Pool();
  if (Number.isNaN(options.idPG)) {
    logger.error(`Veuillez renseigner un idPG valide.`);
    return;
  }
  if (!options.quota || !options.numeroCoselec) {
    logger.error(`Veuillez renseigner un quota et un numero COSELEC.`);
    return;
  }
  const structure: IStructures = await app
    .service(service.structures)
    .Model.findOne({
      idPG: options.idPG,
    });
  if (structure === null) {
    logger.error(`Structure non trouvée.`);
    exit();
  }
  const coselec = getCoselec(structure);
  const nbDePosteCoselec: number = coselec?.nombreConseillersCoselec ?? 0;
  if (nbDePosteCoselec > Number(options.quota)) {
    const nbMiseEnRelationRecruter: number = await app
      .service(service.misesEnRelation)
      .Model.countDocuments({
        statut: { $in: ['recrutee', 'finalisee', 'nouvelle_rupture'] },
        'structure.$id': structure._id,
      });
    const nbDePosteLibre = nbDePosteCoselec - nbMiseEnRelationRecruter;
    if (nbDePosteLibre < Number(options.quota)) {
      logger.error(
        'Le nombre de postes rendus ne peut pas être supérieur ou égal au nombre de conseillers en poste',
      );
      exit();
      return;
    }
  }
  const updatedAt = new Date();
  const datePG = dayjs(updatedAt).format('YYYY-MM-DD');
  const objectUpdated = {
    $set: {
      updatedAt,
      coselecAt: updatedAt,
      estLabelliseFranceServices: 'NON',
    },
    $push: {
      coselec: {
        nombreConseillersCoselec: Number(options.quota),
        avisCoselec: 'POSITIF',
        insertedAt: updatedAt,
        numero: `COSELEC ${options.numeroCoselec}`,
      },
    },
  };
  const objectUpdatedMiseEnRelation = {
    $set: {
      'structureObj.updatedAt': updatedAt,
      'structureObj.coselecAt': updatedAt,
      'structureObj.estLabelliseFranceServices': 'NON',
    },
    $push: {
      'structureObj.coselec': {
        nombreConseillersCoselec: Number(options.quota),
        avisCoselec: 'POSITIF',
        insertedAt: updatedAt,
        numero: `COSELEC ${options.numeroCoselec}`,
      },
    },
  };
  if (Number(options.quota) > 0 && structure.statut !== 'VALIDATION_COSELEC') {
    Object.assign(objectUpdated.$set, {
      'conventionnement.statut':
        StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
      statut: 'VALIDATION_COSELEC',
    });
    Object.assign(objectUpdatedMiseEnRelation.$set, {
      'structureObj.conventionnement.statut':
        StatutConventionnement.CONVENTIONNEMENT_VALIDÉ_PHASE_2,
      'structureObj.statut': 'VALIDATION_COSELEC',
    });
  }
  if (
    Number(options.quota) === 0 &&
    structure.statut === 'VALIDATION_COSELEC'
  ) {
    if (!['ANNULEE', 'ABANDON'].includes(options.statut)) {
      logger.error(
        `Le statut ${options.statut} n'est pas valide pour cette structure`,
      );
      exit();
      return;
    }
    Object.assign(objectUpdated.$set, {
      statut: options.statut,
      userCreated: false,
    });
    Object.assign(objectUpdatedMiseEnRelation.$set, {
      'structureObj.statut': options.statut,
      'structureObj.userCreated': false,
    });
    const userIds: IUser[] = await app
      .service(service.users)
      .Model.find({
        'entity.$id': structure._id,
        $and: [
          { roles: { $elemMatch: { $eq: 'structure' } } },
          { roles: { $elemMatch: { $eq: 'grandReseau' } } },
        ],
      })
      .select({ _id: 1 });
    if (userIds.length > 0) {
      const userUpdated = await app.service(service.users).Model.updateMany(
        {
          _id: { $in: userIds },
        },
        {
          $unset: {
            entity: '',
          },
          $pull: {
            roles: { $in: ['structure', 'structure_coop'] },
          },
        },
      );
      if (userUpdated.modifiedCount > 0) {
        logger.info(
          `COSELEC ${options.numeroCoselec}: ${userUpdated.modifiedCount} compte(s) utilisateur(s) mis à jour lié à la structure ${structure._id}`,
        );
      }
    }
    const accountDelete = await app.service(service.users).Model.deleteMany({
      _id: { $nin: userIds },
      'entity.$id': structure._id,
      roles: { $in: ['structure'] },
    });

    if (accountDelete.deletedCount > 0) {
      logger.info(
        `COSELEC ${options.numeroCoselec}: ${accountDelete.deletedCount} compte(s) utilisateur(s) supprimé(s) lié(s) à la structure ${structure._id}`,
      );
    }
  }
  if (options.franceService) {
    Object.assign(objectUpdated.$set, {
      estLabelliseFranceServices: 'OUI',
    });
    Object.assign(objectUpdatedMiseEnRelation.$set, {
      'structureObj.estLabelliseFranceServices': 'OUI',
    });
  }
  if (
    checkStructurePhase2(structure?.conventionnement?.statut) ||
    structure?.statut === 'CREEE'
  ) {
    Object.assign(objectUpdated.$push.coselec, {
      phaseConventionnement: PhaseConventionnement.PHASE_2,
    });
    Object.assign(objectUpdatedMiseEnRelation.$push['structureObj.coselec'], {
      phaseConventionnement: PhaseConventionnement.PHASE_2,
    });
  }
  await updateStructurePG(pool)(structure.idPG, datePG);
  const structureUpdated = await app
    .service(service.structures)
    .Model.updateOne({ _id: structure._id }, objectUpdated);
  if (structureUpdated.modifiedCount === 1) {
    await app
      .service(service.misesEnRelation)
      .Model.updateMany(
        { 'structure.$id': structure._id },
        objectUpdatedMiseEnRelation,
      );
    logger.info(
      `COSELEC ${options.numeroCoselec}: Structure ${structure._id} possède désormais ${options.quota} conseillers`,
    );
  } else {
    logger.error(`La structure ${structure._id} n'a pas été mise à jour`);
  }
  exit();
});
