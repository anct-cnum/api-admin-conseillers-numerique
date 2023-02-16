import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import mailer from '../../../mailer';
import { invitationActiveCompte } from '../../../emails';

const { v4: uuidv4 } = require('uuid');

const gestionnaireRelanceInvitation =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idGestionnaire = req.params.id;

    try {
      const gestionnaire: IUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({
          _id: new ObjectId(idGestionnaire),
          migrationDashboard: true,
          sub: { $exists: false },
        });
      if (!gestionnaire) {
        res.status(404).json({
          message:
            "Le gestionnaire a déjà activé son compte, s'il a oublié son mot de passe, il pourra le réinitialiser via inclusion connect",
        });
        return;
      }
      const gestionnaireRefreshed = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: gestionnaire._id },
          { $set: { token: uuidv4(), tokenCreatedAt: new Date() } },
          { returnOriginal: false },
        );
      const mailerInstance = mailer(app);
      const message = invitationActiveCompte(app, mailerInstance);
      const errorSmtpMail = await message
        .send(gestionnaireRefreshed)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMail instanceof Error) {
        res.status(503).json({ message: errorSmtpMail.message });
      } else {
        res
          .status(200)
          .json(
            `L'email d'invitation au tableau de pilotage a bien été envoyé à ${gestionnaireRefreshed.name}`,
          );
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

export default gestionnaireRelanceInvitation;
