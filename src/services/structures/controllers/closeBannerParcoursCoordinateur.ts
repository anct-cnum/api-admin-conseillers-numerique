import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const closeBannerParcoursCoordinateur =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { idDemandeCoordinateur, typeBanner } = req.body;
    try {
      if (
        !ObjectId.isValid(idStructure) ||
        !ObjectId.isValid(idDemandeCoordinateur)
      ) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      let objectUpdated = {};
      let objectUpdatedMiseEnRelation = {};
      switch (typeBanner) {
        case 'banniereInformationAvis':
          objectUpdated = {
            'demandesCoordinateur.$.banniereInformationAvis': false,
          };
          objectUpdatedMiseEnRelation = {
            'structureObj.demandesCoordinateur.$.banniereInformationAvis':
              false,
          };
          break;
        case 'banniereValidationAvisPrefet':
          objectUpdated = {
            'demandesCoordinateur.$.banniereValidationAvisPrefet': false,
          };
          objectUpdatedMiseEnRelation = {
            'structureObj.demandesCoordinateur.$.banniereValidationAvisPrefet':
              false,
          };
          break;
        case 'banniereValidationAvisAdmin':
          objectUpdated = {
            'demandesCoordinateur.$.banniereValidationAvisAdmin': false,
          };
          objectUpdatedMiseEnRelation = {
            'structureObj.demandesCoordinateur.$.banniereValidationAvisAdmin':
              false,
          };
          break;
        default:
          res.status(400).json({ message: 'Type de bannière incorrect' });
          return;
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: new ObjectId(idStructure),
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
            statut: 'VALIDATION_COSELEC',
          },
          {
            $set: objectUpdated,
          },
        );
      if (structure.modifiedCount === 0) {
        res
          .status(404)
          .json({ message: "La structure n'a pas été mise à jour" });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
            'structureObj.statut': 'VALIDATION_COSELEC',
            'structureObj.demandesCoordinateur': {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          {
            $set: objectUpdatedMiseEnRelation,
          },
        );
      res.status(200).json(idDemandeCoordinateur);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default closeBannerParcoursCoordinateur;
