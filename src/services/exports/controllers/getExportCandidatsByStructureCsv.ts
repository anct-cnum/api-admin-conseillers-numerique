import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvCandidatByStructure } from '../exports.repository';
import { checkAccessReadRequestMisesEnRelation } from '../../misesEnRelation/misesEnRelation.repository';

const getExportCandidatsByStructureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let misesEnRelation: IMisesEnRelation[];

    try {
      const checkAccesMisesEnRelation =
        await checkAccessReadRequestMisesEnRelation(app, req);
      misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.aggregate(
          [
            {
              $match: {
                $and: [checkAccesMisesEnRelation],
                statut: {
                  $in: ['nouvelle', 'recrutee', 'nonInteressee', 'interessee'],
                },
              },
            },
            {
              $project: {
                conseillerObj: 1,
              },
            },
            {
              $sort: { 'conseillerObj.nom': 1, 'conseillerObj.prenom': 1 },
            },
          ],
          {
            collation: { locale: 'fr' },
            allowDiskUse: true,
          },
        );
      generateCsvCandidatByStructure(misesEnRelation, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportCandidatsByStructureCsv;
