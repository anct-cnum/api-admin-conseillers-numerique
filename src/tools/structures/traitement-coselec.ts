#!/usr/bin/env node

// ts-node src/tools/structures/traitement-coselec.ts -s XXX -q XXX -nc XXX -fs XXX

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import { checkStructurePhase2 } from '../../services/structures/repository/structures.repository';

program.option('-s, --structureId <structureId>', 'id structure');
program.option('-q, --quota <quota>', 'quota');
program.option('-nc, --numeroCoselec <numeroCoselec>', 'numero COSELEC');
program.option('-fs, --franceService <franceService>', 'label France Service');
program.parse(process.argv);

execute(__filename, async ({ app, logger, exit }) => {
  const options = program.opts();

  if (!ObjectId.isValid(options.structureId)) {
    logger.error(`Veuillez renseigner un id structure.`);
    return;
  }
  if (!options.quota || !options.numeroCoselec) {
    logger.error(`Veuillez renseigner un quota et un numero COSELEC.`);
    return;
  }
  const structure: IStructures = await app
    .service(service.structures)
    .Model.findOne({
      _id: new ObjectId(options.structureId),
    });
  if (structure === null) {
    logger.error(`Structure non trouvée.`);
    exit();
  }
  const updatedAt = new Date();
  const objectUpdated = {
    $set: {
      updatedAt,
      coselecAt: updatedAt,
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
  if (structure.statut === 'CREEE') {
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
  if (Number(options.quota) === 0) {
    const nbMiseEnRelationRecruter = await app
      .service(service.misesEnRelation)
      .Model.countDocuments({
        statut: { $in: ['recrutee', 'finalisee', 'nouvelle_rupture'] },
        'structure.$id': structure._id,
      });
    if (nbMiseEnRelationRecruter > 0) {
      logger.error(
        `La structure ${structure._id} possède des conseillers recrutés`,
      );
      exit();
    }
    Object.assign(objectUpdated.$set, {
      statut: 'ABANDON',
      userCreated: false,
    });
    Object.assign(objectUpdatedMiseEnRelation.$set, {
      'structureObj.statut': 'ABANDON',
      'structureObj.userCreated': false,
    });
    const accountDelete = await app.service(service.users).Model.deleteMany({
      'entity.$id': structure._id,
    });

    if (accountDelete.deletedCount > 0) {
      logger.info(
        `COSELEC ${options.numeroCoselec}: ${accountDelete.deletedCount} compte(s) utilisateur(s) supprimé(s) lié à la structure ${structure._id}`,
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
  const update = await app
    .service(service.structures)
    .Model.updateOne({ _id: structure._id }, objectUpdated);
  if (update.modifiedCount === 1) {
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
    logger.info(`La structure ${structure._id} n'a pas été mise à jour`);
  }
  exit();
});
