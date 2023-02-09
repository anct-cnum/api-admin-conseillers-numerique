import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserPrefet } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser, envoiEmailInvit } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');

const postInvitationPrefet =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { body } = req;
    let errorSmtpMail: Error | null = null;
    try {
      const { email, ...localite } = body;
      const errorJoi = await createUserPrefet.validate(body);
      if (errorJoi?.error) {
        res.status(400).json(String(errorJoi?.error));
        return;
      }

      const oldUser = await app
        .service(service.users)
        .findOne({ name: body.email.toLowerCase() });
      if (oldUser === null) {
        const canCreate = req.ability.can(action.create, ressource.users);
        if (!canCreate) {
          res.status(403).json({
            message: `Accès refusé, vous n'êtes pas autorisé à inviter un préfet`,
          });
          return;
        }
        const user: IUser = await app.service(service.users).create({
          name: body.email.toLowerCase(),
          roles: ['prefet'],
          password: uuidv4(),
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          mailSentDate: null,
          passwordCreated: false,
          ...localite,
        });
        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
      } else {
        if (oldUser.roles.includes('prefet')) {
          res.status(409).json({
            message: `Ce compte posséde déjà le rôle préfet`,
          });
          return;
        }
        const user = await app.service(service.users).findOneAndUpdate(
          oldUser._id,
          {
            $set: {
              ...localite,
            },
            $push: {
              roles: 'prefet',
            },
          },
          { new: true },
        );
        if (!oldUser.sub) {
          errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
        }
      }
      if (errorSmtpMail instanceof Error) {
        await deleteUser(app, req, email);
        res.status(503).json({
          message:
            "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
        });
        return;
      }
      res.status(200).json(`Le préfet ${body.email} a bien été invité`);
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

export default postInvitationPrefet;
