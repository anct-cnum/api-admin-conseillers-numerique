import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validationEmail } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';
import { IUser } from '../../../ts/interfaces/db.interfaces';

const { v4: uuidv4 } = require('uuid');

const postInvitationAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { body } = req;
    try {
      delete body.roleActivated;
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un admin`,
        });
        return;
      }
      const errorJoi = await validationEmail.validate(body);
      if (errorJoi?.error) {
        res.status(400).json(String(errorJoi?.error));
        return;
      }
      const user: IUser = await app.service(service.users).create({
        name: body.email.toLowerCase(),
        roles: ['admin', 'admin_coop'],
        password: uuidv4(),
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        mailSentDate: null,
        passwordCreated: false,
      });
      const mailerInstance = mailer(app);
      const message = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('invitationActiveCompte');
      await message.send(user);
      res.status(200).json(`L'admin ${body.email} a bien été invité `);
      return;
    } catch (error) {
      if (error?.code === 409) {
        res.status(409).json({
          message: `Cette adresse mail est déjà utilisée, veuillez choisir une autre adresse mail`,
        });
        return;
      }
      app.service(service.users).delete({ name: body.email.toLowerCase() });
      throw new Error(error);
    }
  };

export default postInvitationAdmin;
