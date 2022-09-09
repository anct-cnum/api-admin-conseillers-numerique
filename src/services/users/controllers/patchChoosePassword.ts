import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { IUser } from '../../../ts/interfaces/db.interfaces';

const { v4: uuidv4 } = require('uuid');

const patchChoosePassword =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
      const user: IUser | null = await app
        .service(service.users)
        .Model.findOne({ token });
      if (user === null) {
        res.status(404).json({ message: 'Utilisateur introuvable' });
      }
      await app.service(service.users).patch(user._id, {
        token: uuidv4(),
        password,
        passwordCreated: true,
        passwordCreatedAt: new Date(),
        tokenCreatedAt: new Date(),
      });
      switch (user.roles[0]) {
        case 'admin':
          // envoie mail admin
          break;
        case 'structure':
          // envoie mail structure
          break;
        case 'prefet':
          // envoie mail prefet
          break;
        default:
          break;
      }
      res.status(200).json('Compte bien activé');
    } catch (error) {
      res.status(500).json(error);
      return;
    }
  };

export default patchChoosePassword;
