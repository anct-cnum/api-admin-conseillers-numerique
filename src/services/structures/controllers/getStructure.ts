import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const structure: IStructures = await app
        .service(service.structures)
        .Model.accessibleBy(req.ability, action.read)
        .findOne(new ObjectId(String(req.query.id)));

      res.status(200).json(structure);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json('Accès refusé');
        return;
      }
      res.status(500).json(error.message);
      throw new Error(error);
    }
  };

export default getStructure;
