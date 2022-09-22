import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { validationEmail } from '../../../schemas/users.schemas';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { deleteUser } from '../../../utils/index';

const { v4: uuidv4 } = require('uuid');
const { DBRef, ObjectId } = require('mongodb');

const postInvitationStructure =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { body } = req;
    try {
      const { structureId, ...validation } = body;
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un compte structure multicompte`,
        });
        return;
      }
      const errorJoi = await validationEmail.validate(validation);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const connect = app.get('mongodb');
      const database = connect.substr(connect.lastIndexOf('/') + 1);
      const user: IUser = await app.service(service.users).create({
        name: body.email.toLowerCase(),
        roles: ['structure', 'structure_coop'],
        entity: new DBRef(
          'structures',
          new ObjectId(req.body.structureId),
          database,
        ),
        password: uuidv4(),
        token: uuidv4(),
        tokenCreatedAt: new Date(),
        passwordCreated: false,
        resend: false,
      });
      const mailerInstance = mailer(app);
      const message = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('invitationActiveCompte');
      await message.send(user);
      res
        .status(200)
        .json(`${body.email} a bien été invité à votre compte structure`);
    } catch (error) {
      if (error?.code === 409) {
        res.status(409).json({
          message: `Cette adresse mail est déjà utilisée, veuillez choisir une autre adresse mail`,
        });
        return;
      }
      await deleteUser(app, service, req, body);
      throw new Error(error);
    }
  };

export default postInvitationStructure;
