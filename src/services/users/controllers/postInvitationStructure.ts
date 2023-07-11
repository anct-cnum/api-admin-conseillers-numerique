import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId, DBRef } from 'mongodb';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validationEmail } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteRoleUser, deleteUser } from '../../../utils/index';
import {
  envoiEmailInformationValidationCoselec,
  envoiEmailInvit,
  envoiEmailMultiRole,
} from '../../../utils/email';

const { v4: uuidv4 } = require('uuid');

const postInvitationStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email, structureId } = req.body;
    let errorSmtpMailInvit: Error | null = null;
    let messageSuccess: string = '';
    try {
      const errorJoi = await validationEmail.validate(email);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const connect = app.get('mongodb');
      const database = connect.substr(connect.lastIndexOf('/') + 1);
      // Pas d'access control car on controle si l'email n'existe pas déjà en base
      const oldUser = await app
        .service(service.users)
        .Model.findOne({ name: email.toLowerCase() });
      if (oldUser === null) {
        const canCreate = req.ability.can(action.create, ressource.users);
        if (!canCreate) {
          res.status(403).json({
            message: `Accès refusé, vous n'êtes pas autorisé à inviter un compte structure multicompte`,
          });
          return;
        }
        const user: IUser = await app.service(service.users).create({
          name: email.toLowerCase(),
          roles: ['structure'],
          entity: new DBRef('structures', new ObjectId(structureId), database),
          password: uuidv4(),
          token: uuidv4(),
          tokenCreatedAt: new Date(),
          passwordCreated: false,
          migrationDashboard: true,
          mailSentDate: null,
          resend: false,
        });
        if (errorSmtpMailInvit instanceof Error) {
          await deleteUser(app, req, email);
          res.status(503).json({
            message:
              "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
          });
          return;
        }
        await envoiEmailInvit(app, req, mailer, user);
        await envoiEmailInformationValidationCoselec(app, mailer, user);
        messageSuccess = `La structure ${email} a bien été invité, un mail de création de compte lui a été envoyé`;
      } else if (
        !oldUser.roles.includes('structure') &&
        !oldUser.roles.includes('grandReseau')
      ) {
        res.status(409).json({
          message: 'Ce compte est déjà utilisé',
        });
        return;
      } else {
        if (oldUser.roles.includes('structure')) {
          res.status(409).json({
            message: `Ce compte possède déjà le rôle structure`,
          });
          return;
        }
        if (oldUser.roles.includes('grandReseau')) {
          const query = {
            $push: {
              roles: 'structure',
            },
            $set: {
              entity: new DBRef(
                'structures',
                new ObjectId(structureId),
                database,
              ),
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
            .Model.findOneAndUpdate(oldUser._id, query, { new: true });
          if (!oldUser.sub) {
            errorSmtpMailInvit = await envoiEmailInvit(app, req, mailer, user);
            messageSuccess = `Le rôle structure a été ajouté au compte ${email}, un mail d'invitation à rejoindre le tableau de bord lui a été envoyé`;
          } else {
            messageSuccess = `Le rôle structure a été ajouté au compte ${email}`;
          }
          if (errorSmtpMailInvit instanceof Error) {
            await deleteRoleUser(app, req, email, {
              $pull: {
                roles: 'structure',
              },
              $unset: {
                entity: '',
              },
            });
            res.status(503).json({
              message:
                "Une erreur est survenue lors de l'envoi, veuillez réessayer dans quelques minutes",
            });
            return;
          }
          await envoiEmailMultiRole(app, mailer, user);
          await envoiEmailInformationValidationCoselec(app, mailer, user);
        } else {
          res.status(409).json({
            message: 'Ce compte est déjà utilisé',
          });
          return;
        }
      }
      res.status(200).json({
        message: messageSuccess,
        account: { _id: 'xxx', name: email.toLowerCase() },
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

export default postInvitationStructure;
