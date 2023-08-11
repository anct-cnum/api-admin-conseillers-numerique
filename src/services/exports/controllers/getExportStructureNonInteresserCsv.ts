import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvStructureNonInteresser } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { StatutConventionnement } from '../../../ts/enum';
import { IStructures } from '../../../ts/interfaces/db.interfaces';

const getExportStructureNonInteresserCsv =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const structures: IStructures[] = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .find({
          'conventionnement.statut': {
            $eq: StatutConventionnement.NON_INTERESSÉ,
          },
        });
      generateCsvStructureNonInteresser(structures, res);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default getExportStructureNonInteresserCsv;
