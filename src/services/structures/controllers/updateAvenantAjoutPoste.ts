import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantAjoutPoste } from '../../../schemas/structures.schemas';
import { PhaseConventionnement } from '../../../ts/enum';
import { checkStructurePhase2 } from '../repository/structures.repository';

const { Pool } = require('pg');

interface IUpdateStructureAvenant {
  $push?: {
    coselec: {
      nombreConseillersCoselec: number;
      avisCoselec: string;
      insertedAt: Date;
      phaseConventionnement?: string;
    };
  };
  $set?: {
    coselecAt?: Date;
    updatedAt?: Date;
    'demandesCoselec.$.statut': string;
    'demandesCoselec.$.nombreDePostesAccordes'?: number;
    'demandesCoselec.$.banniereValidationAvenant'?: boolean;
  };
}

interface IUpdateMiseEnRelationAvenant {
  $push?: {
    'structureObj.coselec': {
      nombreConseillersCoselec: number;
      avisCoselec: string;
      insertedAt: Date;
      phaseConventionnement?: string;
    };
  };
  $set?: {
    'structureObj.coselecAt'?: Date;
    'structureObj.updatedAt'?: Date;
    'structureObj.demandesCoselec.$.statut': string;
    'structureObj.demandesCoselec.$.nombreDePostesAccordes'?: number;
    'structureObj.demandesCoselec.$.banniereValidationAvenant'?: boolean;
  };
}

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

const updateAvenantAjoutPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const pool = new Pool();
    const { statut, nbDePosteAccorder, nbDePosteCoselec } = req.body;
    const paramsUpdateCollectionStructure: IUpdateStructureAvenant = {};
    const paramsUpdateCollectionMiseEnRelation: IUpdateMiseEnRelationAvenant =
      {};
    const avenantAJoutPosteValidation = avenantAjoutPoste.validate({
      statut,
      nbDePosteAccorder,
      nbDePosteCoselec,
    });

    if (avenantAJoutPosteValidation.error) {
      res
        .status(400)
        .json({ message: avenantAJoutPosteValidation.error.message });
      return;
    }
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
            _id: new ObjectId(idStructure),
          },
          { _id: 0, conventionnement: 1 },
        );
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      if (statut === 'POSITIF') {
        const dateCoselec = new Date();
        const datePG = dayjs(dateCoselec).format('YYYY-MM-DD');
        paramsUpdateCollectionStructure.$set = {
          coselecAt: dateCoselec,
          updatedAt: dateCoselec,
          'demandesCoselec.$.statut': 'validee',
          'demandesCoselec.$.nombreDePostesAccordes': Number(nbDePosteAccorder),
          'demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionStructure.$push = {
          coselec: {
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: dateCoselec,
          },
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.coselecAt': dateCoselec,
          'structureObj.updatedAt': dateCoselec,
          'structureObj.demandesCoselec.$.statut': 'validee',
          'structureObj.demandesCoselec.$.nombreDePostesAccordes':
            Number(nbDePosteAccorder),
          'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionMiseEnRelation.$push = {
          'structureObj.coselec': {
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: dateCoselec,
          },
        };
        await updateStructurePG(pool)(structure.idPG, datePG);
      }
      if (statut === 'NÉGATIF') {
        paramsUpdateCollectionStructure.$set = {
          'demandesCoselec.$.statut': 'refusee',
          'demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.demandesCoselec.$.statut': 'refusee',
          'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionStructure.$push = {
          coselec: {
            nombreConseillersCoselec: 0,
            avisCoselec: 'NÉGATIF',
            insertedAt: new Date(),
          },
        };
        paramsUpdateCollectionMiseEnRelation.$push = {
          'structureObj.coselec': {
            nombreConseillersCoselec: 0,
            avisCoselec: 'NÉGATIF',
            insertedAt: new Date(),
          },
        };
      }
      if (checkStructurePhase2(structure?.conventionnement?.statut)) {
        paramsUpdateCollectionStructure.$push.coselec.phaseConventionnement =
          PhaseConventionnement.PHASE_2;
        Object.assign(
          paramsUpdateCollectionMiseEnRelation.$push['structureObj.coselec'],
          {
            phaseConventionnement: PhaseConventionnement.PHASE_2,
          },
        );
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(idStructure),
            demandesCoselec: {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'ajout' },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          paramsUpdateCollectionStructure,
        );
      if (structureUpdated.modifiedCount === 0) {
        res.status(400).json({ message: "L'avenant n'a pas pu être modifié" });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
            'structureObj.demandesCoselec': {
              $elemMatch: {
                statut: { $eq: 'en_cours' },
                type: { $eq: 'ajout' },
              },
            },
            'structureObj.statut': 'VALIDATION_COSELEC',
          },
          paramsUpdateCollectionMiseEnRelation,
        );
      res.status(200).json({
        statutAvenantAjoutPosteUpdated:
          statut === 'POSITIF' ? 'validee' : 'refusee',
        nbDePosteAccorderUpdated: nbDePosteAccorder,
      });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateAvenantAjoutPoste;
