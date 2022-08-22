import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvRupture } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const getExportRupturesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let miseEnRelations: IMisesEnRelation[];
    try {
      miseEnRelations = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({ statut: { $eq: 'nouvelle_rupture' } });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(401).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      return;
    }
    generateCsvRupture(miseEnRelations, res, app);
  };

export default getExportRupturesCsv;
