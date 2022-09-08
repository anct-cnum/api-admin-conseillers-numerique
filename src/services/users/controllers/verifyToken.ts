import { Application } from '@feathersjs/express';
import { Response } from 'express';
import service from '../../../helpers/services';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const verifyToken =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { token } = req.params;
    try {
      const user: IUser | null = await app
        .service(service.users)
        .Model.findOne({ token });
      if (user === null) {
        res.statusMessage = 'Utilisateur introuvable';
        res.status(404).end();
        return;
      }
      res.send({ roles: user.roles, name: user.name });
    } catch (error) {
      res.statusMessage = error.message;
      res.status(500).end();
    }
  };

export default verifyToken;
