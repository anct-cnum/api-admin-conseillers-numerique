import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const checkDisplayBannerParcoursCoordinateur =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const structure = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(
          {
            demandesCoordinateur: {
              $elemMatch: {
                statut: { $eq: 'validee' },
              },
            },
          },
          {
            'demandesCoordinateur.$': 1,
          },
        );
      if (!structure) {
        res.status(200).json(false);
        return;
      }
      const coordinateurs = await app
        .service(service.conseillers)
        .Model.aggregate([
          {
            $match: {
              structureId: structure._id,
              statut: 'RECRUTE',
              estCoordinateur: true,
            },
          },
          {
            $lookup: {
              from: 'users',
              let: { idConseiller: '$_id' },
              as: 'users',
              pipeline: [
                {
                  $match: {
                    $and: [
                      { $expr: { $eq: ['$$idConseiller', '$entity.oid'] } },
                      { $expr: { $in: ['coordinateur_coop', '$roles'] } },
                    ],
                  },
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
            },
          },
        ]);
      const displayBanner =
        coordinateurs[0].count < structure.demandesCoordinateur.length;
      res.status(200).json(displayBanner);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default checkDisplayBannerParcoursCoordinateur;
