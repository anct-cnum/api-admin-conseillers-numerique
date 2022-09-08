import { Application } from '@feathersjs/express';
import { Response } from 'express';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const verifyToken =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { token } = req.params;
    try {
      const user = await app
        .service(service.users)
        .Model.aggregate([
          { $match: { token } },
          { $limit: 1 },
          { $project: { name: 1, roles: 1, _id: 0 } },
        ]);
      if (user.length === 0) {
        res.status(404).json({ message: 'token invalide' });
        return;
      }
      res.send(user[0]);
    } catch (error) {
      res.status(401).json(error.message);
    }
  };

export default verifyToken;
