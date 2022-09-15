import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getStructures =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const structures: IStructures[] | IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .find();

      res.status(200).json(structures);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStructures;
