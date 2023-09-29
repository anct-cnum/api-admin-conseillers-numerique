import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const updateDemandeCoordinateurRefusAvisAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { idDemandeCoordinateur } = req.body;
    if (
      !ObjectId.isValid(idStructure) ||
      !ObjectId.isValid(idDemandeCoordinateur)
    ) {
      res.status(400).json({ message: 'Id incorrect' });
      return;
    }
    const updatedDemandeCoordinateur = {
      $set: {
        'demandesCoordinateur.$.statut': 'refusee',
        'demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'demandesCoordinateur.$.banniereInformationAvis': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.statut': 'refusee',
        'structureObj.demandesCoordinateur.$.banniereValidationAvisAdmin': true,
        'structureObj.demandesCoordinateur.$.banniereInformationAvis': true,
      },
    };
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idStructure),
          $or: [
            {
              statut: 'VALIDATION_COSELEC',
            },
            {
              coordinateurCandidature: true,
              statut: 'CREEE',
            },
          ],
        });
      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }
      if (structure.statut === 'CREEE') {
        Object.assign(updatedDemandeCoordinateur.$set, {
          statut: 'REFUS_COORDINATEUR',
        });
        Object.assign(updatedDemandeCoordinateurMiseEnRelation.$set, {
          'structureObj.statut': 'REFUS_COORDINATEUR',
        });
      }
      const structureUpdated = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.update)
        .updateOne(
          {
            _id: structure._id,
            demandesCoordinateur: {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateur,
        );
      if (structureUpdated.modifiedCount === 0) {
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
            'structure.$id': structure._id,
            'structureObj.demandesCoordinateur': {
              $elemMatch: {
                id: { $eq: new ObjectId(idDemandeCoordinateur) },
              },
            },
          },
          updatedDemandeCoordinateurMiseEnRelation,
        );
      res.status(200).json({ success: true });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default updateDemandeCoordinateurRefusAvisAdmin;
