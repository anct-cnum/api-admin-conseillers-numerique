import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validationEmail } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser, envoieEmailInvit } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');

const postInvitationAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email } = req.body;
    try {
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un admin`,
        });
        return;
      }
      const errorJoi = await validationEmail.validate(email);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const user: IUser = await app.service(service.users).create({
        name: email.toLowerCase(),
        roles: ['admin', 'admin_coop'],
        password: uuidv4(),
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        mailSentDate: null,
        passwordCreated: false,
      });
      const errorSmtpMail = await envoieEmailInvit(
        app,
        req,
        mailer,
        emails,
        user,
      );
      if (errorSmtpMail instanceof Error) {
        await deleteUser(app, service, req, action, email);
        res.status(503).json({
          message:
            "Une erreur est survenue lors de l'envoi, veuillez réessayez dans quelques minutes",
        });
        return;
      }
      res.status(200).json(`L'admin ${email} a bien été invité `);
      return;
    } catch (error) {
      if (error?.code === 409) {
        res.status(409).json({
          message: `Cette adresse mail est déjà utilisée, veuillez choisir une autre adresse mail`,
        });
        return;
      }
      throw new Error(error);
    }
  };

export default postInvitationAdmin;
