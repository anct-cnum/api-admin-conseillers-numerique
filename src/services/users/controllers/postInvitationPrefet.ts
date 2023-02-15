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
    let messageSuccess: string = '';
    try {
      const { email, ...localite } = body;
      const errorJoi = await createUserPrefet.validate(body);
      if (errorJoi?.error) {
        res.status(400).json(String(errorJoi?.error));
        return;
      }

      const oldUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
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
          migrationDashboard: true,
          passwordCreated: false,
          ...localite,
        });
        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
        messageSuccess = `Le préfet ${email} a bien été invité, un mail de création de compte lui a été envoyé`;
      } else {
        if (oldUser.roles.includes('prefet')) {
          res.status(409).json({
            message: `Ce compte posséde déjà le rôle préfet`,
          });
          return;
        }
        if (
          oldUser.roles.includes('conseiller') ||
          oldUser.roles.includes('candidat')
        ) {
          res.status(409).json({
            message: 'Le compte est déjà utilisé par un candidat ou conseiller',
          });
          return;
        }
        const query = {
          $push: {
            roles: 'prefet',
          },
          $set: {
            ...localite,
            migrationDashboard: true,
          },
        };
        if (!oldUser.sub) {
          Object.assign(query.$set, {
            token: uuidv4(),
            tokenCreatedAt: new Date(),
            mailSentDate: null,
          });
        }
        const user = await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(oldUser._id, query, { new: true });
        if (!oldUser.sub) {
          errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
          messageSuccess = `Le rôle préfet a été ajouté au compte ${email}, un mail d'invitation à rejoindre le tableau de bord lui a été envoyé`;
        } else {
          messageSuccess = `Le rôle préfet a été ajouté au compte ${email}`;
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
      res.status(200).json(messageSuccess);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default postInvitationPrefet;
