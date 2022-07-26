import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidatByStructure } from '../exports.repository';

const getExportCandidatsByStructureCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    let misesEnRelation: IMisesEnRelation[];

    try {
      misesEnRelation = await app
        .service(service.misesEnRelation)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          statut: { $nin: ['finalisee_non_disponible', 'non_disponible'] },
        })
        .collation({ locale: 'fr' })
        .sort({ 'conseillerObj.nom': 1, 'conseillerObj.prenom': 1 });
      generateCsvCandidatByStructure(misesEnRelation, res, app);
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
