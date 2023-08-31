import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvDemandesRuptures } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const getExportDemandesRupturesCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let miseEnRelations: IMisesEnRelation[];
    try {
      miseEnRelations = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({ statut: { $eq: 'nouvelle_rupture' } });

      generateCsvDemandesRuptures(miseEnRelations, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportDemandesRupturesCsv;
