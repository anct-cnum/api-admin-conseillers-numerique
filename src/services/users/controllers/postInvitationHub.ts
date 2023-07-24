import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserHub } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser } from '../../../utils/index';
import { envoiEmailInvit } from '../../../utils/email';

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
      const oldUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email.toLowerCase() });
      if (oldUser === null) {
        const user: IUser = await app.service(service.users).create({
          name: email.toLowerCase(),
          nom,
          prenom,
          hub,
          roles: ['hub_coop'],
          password: uuidv4(),
          token: uuidv4(),
          migrationDashboard: true,
          tokenCreatedAt: new Date(),
          mailSentDate: null,
          passwordCreated: false,
        });
        const errorSmtpMail: Error | null = await envoiEmailInvit(
          app,
          req,
          mailer,
          user,
        );
        if (errorSmtpMail instanceof Error) {
          await deleteUser(app, req, email);
          res.status(503).json({
            message:
              "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
          });
          return;
        }
        res
          .status(200)
          .json(
            `Le hub ${email} a bien été invité, un mail de création de compte lui a été envoyé`,
          );
      } else {
        res.status(409).json({
          message: 'Ce compte est déjà utilisé',
        });
      }
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.status(403).json({ message: 'Accès refusé' });
        return;
      }
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default postInvitationHub;
