import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidat } from '../exports.repository';

const getExportJeRecruteCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let miseEnRelations: IMisesEnRelation[];
    try {
      miseEnRelations = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          $or: [
            { statut: { $eq: 'recrutee' } },
            { statut: { $eq: 'finalisee' } },
            { statut: { $eq: 'nouvelle_rupture' } },
          ],
        })
        .sort({ 'miseEnrelation.structure.oid': 1 });
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
    generateCsvCandidat(miseEnRelations, res, app);
  };

export default getExportJeRecruteCsv;
