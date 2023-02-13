import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validationEmail } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser, envoiEmailInvit } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');
const { DBRef, ObjectId } = require('mongodb');

const postInvitationStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { email, structureId } = req.body;
    let errorSmtpMail: Error | null = null;
    try {
      const errorJoi = await validationEmail.validate(email);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const connect = app.get('mongodb');
      const database = connect.substr(connect.lastIndexOf('/') + 1);
      const oldUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ name: email.toLowerCase() });
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

        errorSmtpMail = await envoiEmailInvit(app, req, mailer, user);
      } else {
        if (oldUser.roles.includes('structure')) {
          res.status(409).json({
            message: `Ce compte posséde déjà le rôle structure`,
          });
          return;
        }
        if (oldUser.roles.includes('coordinateur_coop')) {
          res.status(409).json({
            message: `Les comptes coordinateur ne peuvent pas être invités en tant que structure`,
          });
          return;
        }
        let query = {
          $push: {
            roles: 'structure',
          },
        };
        if (!oldUser.sub) {
          query = {
            ...query,
            ...{
              $set: {
                entity: new DBRef(
                  'structures',
                  new ObjectId(structureId),
                  database,
                ),
                migrationDashboard: true,
                token: uuidv4(),
                tokenCreatedAt: new Date(),
                mailSentDate: null,
              },
            },
          };
        } else {
          query = {
            ...query,
            ...{
              $set: {
                entity: new DBRef(
                  'structures',
                  new ObjectId(structureId),
                  database,
                ),
              },
            },
          };
        }
        const user = await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .findOneAndUpdate(oldUser._id, query, { new: true });
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
      res.status(200).json(`Le compte structure ${email} a bien été invité`);
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

export default postInvitationStructure;
