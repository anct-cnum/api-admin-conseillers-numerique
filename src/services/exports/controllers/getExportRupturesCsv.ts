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
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      return;
    }
    generateCsvRupture(miseEnRelations, res, app);
  };

export default getExportRupturesCsv;
