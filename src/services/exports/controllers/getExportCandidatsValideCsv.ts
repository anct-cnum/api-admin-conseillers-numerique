import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidat } from '../exports.repository';

const getExportCandidatsValideStructureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let misesEnRelations: IMisesEnRelation[];
    try {
      misesEnRelations = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({ statut: { $eq: 'recrutee' } })
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

    generateCsvCandidat(misesEnRelations, res, app);
  };

export default getExportCandidatsValideStructureCsv;
