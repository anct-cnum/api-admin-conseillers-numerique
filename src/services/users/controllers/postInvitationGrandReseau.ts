import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserGrandReseau } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser } from '../../../utils/index';
import { envoiEmailInvit, envoiEmailMultiRole } from '../../../utils/email';

const { v4: uuidv4 } = require('uuid');

const postInvitationGrandReseau =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email, reseau, nom, prenom } = req.body;
    let errorSmtpMail: Error | null = null;
    let errorSmtpMailMultiRole: Error | null = null;
    let user: IUser | null = null;
    let messageSuccess: string = '';
    try {
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un grand réseau`,
        });
        return;
      }
      const errorJoi = await createUserGrandReseau.validate(req.body);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const oldUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email.toLowerCase() });
      if (oldUser === null) {
        user = await app.service(service.users).create({
          name: email.toLowerCase(),
          reseau,
          nom,
          prenom,
          roles: ['grandReseau'],
          password: uuidv4(),
          token: uuidv4(),
          migrationDashboard: true,
          tokenCreatedAt: new Date(),
          mailSentDate: null,
          passwordCreated: false,
        });
        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
        messageSuccess =
          'Invitation envoyée, le nouvel administrateur a été ajouté, un mail de création de compte lui a été envoyé';
      } else {
        if (oldUser.roles.includes('grandReseau')) {
          res.status(409).json({
            message: `Ce compte possède déjà le rôle grand réseau`,
          });
          return;
        }
        if (oldUser.roles.includes('structure')) {
          const query = {
            $push: {
              roles: 'grandReseau',
            },
            $set: {
              nom,
              prenom,
              migrationDashboard: true,
              reseau,
            },
          };
          if (!oldUser.sub) {
            Object.assign(query.$set, {
              token: uuidv4(),
              tokenCreatedAt: new Date(),
              mailSentDate: null,
            });
          }
          user = await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.update)
            .findOneAndUpdate(oldUser._id, query, { new: true });
          if (!oldUser.sub) {
            errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
            messageSuccess = `Le rôle grand réseau a été ajouté au compte ${email}, un mail d'invitation à rejoindre le tableau de bord lui a été envoyé`;
          } else {
            user.sub = 'xxxxxxxxx';
            messageSuccess = `Le rôle grand réseau a été ajouté au compte ${email}`;
          }
          errorSmtpMailMultiRole = await envoiEmailMultiRole(app, mailer, user);
        } else {
          res.status(409).json({
            message: 'Ce compte est déjà utilisé',
          });
          return;
        }
      }
      if ((errorSmtpMail || errorSmtpMailMultiRole) instanceof Error) {
        await deleteUser(app, req, email);
        res.status(503).json({
          message:
            "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
        });
        return;
      }
      res.status(200).json({
        message: messageSuccess,
        account: user,
      });
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default postInvitationGrandReseau;
