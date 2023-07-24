import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getMisesEnRelationStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idStructure = req.params.id;

    try {
      const query = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .getQuery();

      if (!ObjectId.isValid(idStructure)) {
        res.status(400).json({ message: 'Id incorrect' });
        return;
      }
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
              statut: {
                $in: [
                  'finalisee',
                  'nouvelle_rupture',
                  'renouvellement_initiee',
                  'recrutee',
                  'finalisee_rupture',
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'misesEnRelation',
              localField: 'miseEnRelationConventionnement',
              foreignField: '_id',
              as: 'originalMiseEnRelation',
            },
          },
          {
            $unwind: {
              path: '$originalMiseEnRelation',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              miseEnRelationReconventionnement: { $eq: null },
            },
          },
          {
            $project: {
              conseillerObj: 1,
              statut: 1,
              reconventionnement: 1,
              dateDebutDeContrat: 1,
              dateFinDeContrat: 1,
              typeDeContrat: 1,
              salaire: 1,
              originalMiseEnRelation: 1,
              miseEnRelationConventionnement: 1,
              miseEnRelationReconventionnement: 1,
              banniereValidationRenouvellement: 1,
              createdAt: 1,
            },
          },
          {
            $sort: {
              'conseillerObj._id': 1,
              createdAt: -1,
            },
          },
          {
            $group: {
              _id: '$conseillerObj._id',
              miseEnRelation: { $first: '$$ROOT' },
            },
          },
          {
            $replaceRoot: { newRoot: '$miseEnRelation' },
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

export default getMisesEnRelationStructure;
