import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { avenantAjoutPoste } from '../../../schemas/structures.schemas';

const updateAvenantAjoutPoste =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { statut, nbDePosteAccorder, nbDePosteCoselec } = req.body;
    const paramsUpdateCollectionStructure = {
      $set: {},
      $push: {},
    };
    const paramsUpdateCollectionMiseEnRelation = {
      $set: {},
      $push: {},
    };
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
      if (statut === 'POSITIF') {
        paramsUpdateCollectionStructure.$set = {
          'demandesCoselec.$.statut': 'validee',
          'demandesCoselec.$.nombreDePostesAccordes': Number(nbDePosteAccorder),
          'demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionStructure.$push = {
          coselec: {
            type: 'avenant',
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: new Date(),
          },
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.demandesCoselec.$.statut': 'validee',
          'structureObj.demandesCoselec.$.nombreDePostesAccordes':
            Number(nbDePosteAccorder),
          'structureObj.demandesCoselec.$.banniereValidationAvenant': true,
        };
        paramsUpdateCollectionMiseEnRelation.$push = {
          'structureObj.coselec': {
            type: 'avenant',
            nombreConseillersCoselec:
              Number(nbDePosteAccorder) + Number(nbDePosteCoselec),
            avisCoselec: 'POSITIF',
            insertedAt: new Date(),
          },
        };
      }
      if (statut === 'NÉGATIF') {
        paramsUpdateCollectionStructure.$set = {
          'demandesCoselec.$.statut': 'refusee',
        };
        paramsUpdateCollectionMiseEnRelation.$set = {
          'structureObj.demandesCoselec.$.statut': 'refusee',
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
      const structure = await app
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
      if (structure.modifiedCount === 0) {
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
