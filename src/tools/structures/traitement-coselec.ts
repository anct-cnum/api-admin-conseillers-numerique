#!/usr/bin/env node

// ts-node src/tools/structures/traitement-coselec.ts -s XXX -q XXX -nc XXX -fs XXX

import { program } from 'commander';
import { ObjectId } from 'mongodb';
import execute from '../utils';
import service from '../../helpers/services';
import { PhaseConventionnement, StatutConventionnement } from '../../ts/enum';
import { IStructures } from '../../ts/interfaces/db.interfaces';

program.option('-s, --structureId <structureId>', 'id structure');
program.option('-q', '--quota <quota>', 'quota');
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
  }
  if (options.franceService) {
    Object.assign(objectUpdated.$set, {
      estLabelliseFranceServices: true,
    });
    Object.assign(objectUpdatedMiseEnRelation.$set, {
      'structureObj.estLabelliseFranceServices': true,
    });
  }
  if (
    structure?.conventionnement?.statut ===
    StatutConventionnement.RECONVENTIONNEMENT_VALIDÉ
  ) {
    Object.assign(objectUpdated.$push.coselec, {
      phaseConventionnement: PhaseConventionnement.PHASE_2,
    });
    Object.assign(objectUpdated.$push['structureObj.coselec'], {
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
      `COSELEC ${options.numero}: Structure ${structure._id} possède désormais ${options.quota} conseillers`,
    );
  } else {
    logger.info(`La structure ${structure._id} n'a pas été mise à jour`);
  }
  exit();
});
