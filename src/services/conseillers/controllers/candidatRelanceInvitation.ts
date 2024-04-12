import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import mailer from '../../../mailer';
import { creationCompteCandidat } from '../../../emails';

const { v4: uuidv4 } = require('uuid');

const candidatRelanceInvitation =
  (app: Application) => async (req: IRequest, res: Response) => {
    const idConseiller = req.params.id;

    try {
      const conseiller: IConseillers = await app
        .service(service.conseillers)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ _id: new ObjectId(idConseiller) });
      if (!conseiller) {
        res.status(404).json({ message: "Le candidat n'existe pas" });
        return;
      }
      const conseillerUser = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .findOne({ 'entity.$id': new ObjectId(idConseiller) });
      if (!conseillerUser) {
        res.status(404).json({
          message:
            'Le candidat ne possède pas de compte (doublon ou inactivité)',
        });
        return;
      }
      if (conseillerUser.passwordCreated === true) {
        res.status(409).json({
          message: `Le compte de ${conseiller.nom} ${conseiller.prenom} est déjà activé`,
        });
        return;
      }
      const users = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: conseillerUser._id },
          { $set: { token: uuidv4(), tokenCreatedAt: new Date() } },
          { returnOriginal: false, includeResultMetadata: true },
        );
      if (users.lastErrorObject.n === 0) {
        res.status(409).json({
          message: "La mise à jour de l'utilisateur n'a pas pu être réalisé !",
        });
        return;
      }
      const mailerInstance = mailer(app);
      const message = creationCompteCandidat(app, mailerInstance, req);
      const errorSmtpMail = await message
        .send(users.value)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMail instanceof Error) {
        res.status(503).json({ message: errorSmtpMail.message });
      } else {
        res
          .status(200)
          .json(
            `L'email d'invitation à l'espace candidat a bien été envoyé à ${conseillerUser.nom} ${conseillerUser.prenom}`,
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

export default candidatRelanceInvitation;
