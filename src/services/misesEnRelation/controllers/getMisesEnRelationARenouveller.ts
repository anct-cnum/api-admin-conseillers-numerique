import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getMisesEnRelationARenouveller =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;

    try {
      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        res.status(404).json({ message: "La structure n'existe pas" });
        return;
      }

      const misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [query],
              'structure.$id': new ObjectId(idStructure),
              statut: {
                $in: ['finalisee'],
              },
            },
          },
          {
            $sort: {
              dateRecrutement: 1,
            },
          },
          {
            $unwind: {
              path: '$conseillerObj',
            },
          },
          {
            $project: {
              conseillerObj: '$conseillerObj',
              statut: 1,
              reconventionnement: 1,
              dateRecrutement: 1,
              typeDeContrat: 1,
              _id: 1,
            },
          },
          {
            $group: {
              _id: '$conseillerObj',
              dateRecrutement: { $last: '$dateRecrutement' },
              statut: { $last: '$statut' },
              typeDeContrat: { $last: '$typeDeContrat' },
              reconventionnement: { $last: '$reconventionnement' },
              miseEnRelationId: { $last: '$_id' },
            },
          },
          {
            $project: {
              _id: 0,
              conseiller: '$_id',
              dateRecrutement: 1,
              statut: 1,
              reconventionnement: 1,
              miseEnRelationId: 1,
              typeDeContrat: 1,
            },
          },
        ]);
      res.status(200).json(misesEnRelation);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getMisesEnRelationARenouveller;
