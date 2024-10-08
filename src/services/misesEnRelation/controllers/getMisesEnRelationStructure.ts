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
        return res.status(400).json({ message: 'Id incorrect' });
      }
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne();

      if (!structure) {
        return res.status(404).json({ message: "La structure n'existe pas" });
      }

      const misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [query],
              $or: [
                {
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
                { banniereRefusRecrutement: true },
              ],
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
              phaseConventionnement: 1,
              banniereRefusRecrutement: 1,
              demandesDeProlongation: 1,
            },
          },
          {
            $sort: {
              'conseillerObj._id': 1,
              createdAt: -1,
            },
          },
        ]);
      return res.status(200).json(misesEnRelation);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getMisesEnRelationStructure;
