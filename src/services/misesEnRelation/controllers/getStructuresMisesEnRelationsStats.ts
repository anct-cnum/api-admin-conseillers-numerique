import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { checkAccessReadRequestMisesEnRelation } from '../misesEnRelation.repository';

const getStructuresMisesEnRelationsStats =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const checkAccess = await checkAccessReadRequestMisesEnRelation(app, req);
      const statsDisponibles = await app
        .service(service.misesEnRelation)
        .Model.aggregate([
          {
            $match: {
              $and: [checkAccess],
              statut: {
                $nin: [
                  'non_disponible',
                  'finalisee_non_disponible',
                  'terminee',
                  'renouvellement_initiee',
                ],
              },
            },
          },
          { $group: { _id: '$statut', count: { $sum: 1 } } },
          {
            $group: {
              _id: null,
              total: { $sum: '$count' },
              stats: { $push: { statut: '$_id', count: '$count' } },
            },
          },
          {
            $addFields: {
              stats: {
                $concatArrays: [
                  [{ statut: 'toutes', count: '$total' }],
                  '$stats',
                ],
              },
            },
          },
        ]);
      return res.status(200).json(statsDisponibles[0]);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getStructuresMisesEnRelationsStats;
