import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { ICras } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getStatsNationales =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const cras: ICras[] | ICras = await app
        .service(service.cras)
        .Model.accessibleBy(req.ability, action.read)
        .find();

      res.status(200).json(cras);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStatsNationales;
