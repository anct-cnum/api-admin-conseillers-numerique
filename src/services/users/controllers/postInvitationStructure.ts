import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserAdminAndStructure } from '../../../schemas/users.schemas';

const { v4: uuidv4 } = require('uuid');
const { DBRef, ObjectId } = require('mongodb');

const postInvitationMulticompte =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const { body } = req;
      const { structureId, ...validation } = body;
      const canCreate = req.ability.can(action.create, ressource.users);
      if (!canCreate) {
        res.status(403).json({
          message: `Accès refusé, vous n'êtes pas autorisé à inviter un compte structure multicompte`,
        });
        return;
      }
      const errorJoi = await createUserAdminAndStructure.validate(validation);
      if (errorJoi?.error) {
        res.status(400).json({ message: String(errorJoi?.error) });
        return;
      }
      const connect = app.get('mongodb');
      const database = connect.substr(connect.lastIndexOf('/') + 1);
      await app.service(service.users).create({
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
      // partie envoie de l'email
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
      res.status(401).json(error);
    }
  };

export default postInvitationMulticompte;
