import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';

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
      const mailerInstance = mailer(app);
      const message = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('bienvenueCompteActive');
      await message.send(user);
      res.status(200).json('Compte bien activé');
    } catch (error) {
      throw new Error(error);
    }
  };

export default patchChoosePassword;
