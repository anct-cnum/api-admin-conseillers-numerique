import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserAdmin } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser, envoiEmailInvit } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');

const postInvitationAdmin =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email, nom, prenom } = req.body;
    let errorSmtpMail: Error | null = null;
    let messageSuccess: string = '';
    try {
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un admin`,
        });
        return;
      }
      const errorJoi = await createUserAdmin.validate(req.body);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const oldUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email.toLowerCase() });
      if (oldUser === null) {
        const user: IUser = await app.service(service.users).create({
          name: email.toLowerCase(),
          roles: ['admin'],
          nom,
          prenom,
          password: uuidv4(),
          migrationDashboard: true,
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          mailSentDate: null,
          passwordCreated: false,
        });
        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
        messageSuccess = `L'admin ${email} a bien été invité, un mail de création de compte lui à été envoyé`;
      } else {
        if (oldUser.roles.includes('admin')) {
          res.status(409).json({
            message: `Ce compte posséde déjà le rôle admin`,
          });
          return;
        }
        const query = {
          $push: {
            roles: 'admin',
          },
          $set: {
            nom,
            prenom,
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
          messageSuccess = `Le rôle admin a été ajouté au compte ${email}, un mail d'invitation à rejoindre le tableau de bord lui à été envoyé`;
        } else {
          messageSuccess = `Le rôle admin a été ajouté au compte ${email}`;
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
