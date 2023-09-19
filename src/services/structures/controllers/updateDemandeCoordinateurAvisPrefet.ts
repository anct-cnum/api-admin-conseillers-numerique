import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { demandeCoordinateurAvisPrefet } from '../../../schemas/coordinateur.schemas';

const updateDemandeCoordinateurAvisPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { avisPrefet, idDemandeCoordinateur, commentaire } = req.body;
    const avisPrefetValidation = demandeCoordinateurAvisPrefet.validate({
      avisPrefet,
      idDemandeCoordinateur,
      commentaire,
    });

    if (avisPrefetValidation.error) {
      res.status(400).json({ message: avisPrefetValidation.error.message });
      return;
    }
    const updatedDemandeCoordinateur = {
      $set: {
        'demandesCoordinateur.$.avisPrefet': avisPrefet,
        'demandesCoordinateur.$.banniereValidationAvisPrefet': true,
      },
    };
    const updatedDemandeCoordinateurMiseEnRelation = {
      $set: {
        'structureObj.demandesCoordinateur.$.avisPrefet': avisPrefet,
        'structureObj.demandesCoordinateur.$.banniereValidationAvisPrefet':
          true,
      },
    };
    if (commentaire.length > 0) {
      updatedDemandeCoordinateur.$set['demandesCoordinateur.$.commentaire'] =
        commentaire;
      updatedDemandeCoordinateurMiseEnRelation.$set[
        'structureObj.demandesCoordinateur.$.commentaire'
      ] = commentaire;
    }
    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
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
          updatedDemandeCoordinateur,
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

export default updateDemandeCoordinateurAvisPrefet;
