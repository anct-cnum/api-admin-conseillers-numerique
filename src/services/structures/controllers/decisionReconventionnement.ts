import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const decisionReconventionnement =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;
    const { statut } = req.body;
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
            statut: 'VALIDATION_COSELEC',
            'conventionnement.dossierReconventionnement.statut': 'accepte',
          },
          {
            $set: {
              'conventionnement.statut': statut,
            },
          },
        );
      if (structure.modifiedCount === 0) {
        res
          .status(400)
          .json({ message: "Le reconventionnement n'a pas pu être validé" });
        return;
      }
      await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.update)
        .updateMany(
          {
            'structure.$id': new ObjectId(idStructure),
            'structureObj.statut': 'VALIDATION_COSELEC',
            'structureObj.conventionnement.dossierReconventionnement.statut':
              'accepte',
          },
          {
            $set: {
              'structureObj.conventionnement.statut': statut,
            },
          },
        );
      res.status(200).json({
        statutReconventionnementUpdated: statut,
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

export default decisionReconventionnement;
