import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserHub } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser, envoiEmailInvit } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');

const postInvitationHub =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email, nom, prenom, hub } = req.body;
    try {
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un hub`,
        });
        return;
      }
      const errorJoi = await createUserHub.validate(req.body);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const user: IUser = await app.service(service.users).create({
        name: email.toLowerCase(),
        nom,
        prenom,
        hub,
        roles: ['hub_coop'],
        password: uuidv4(),
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        mailSentDate: null,
        passwordCreated: false,
      });
      const errorSmtpMail = await envoiEmailInvit(
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
      res.status(200).json(`Hub : ${email} a bien été invité `);
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

export default postInvitationHub;
