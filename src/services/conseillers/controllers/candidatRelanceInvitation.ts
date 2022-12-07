import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';

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
          message: 'Le candidat ne possède pas de compte',
        });
        return;
      }
      if (conseillerUser.passwordCreated === true) {
        res.status(409).json({
          message: `Le compte de ${conseiller.prenom} ${conseiller.nom} est déjà activé`,
        });
        return;
      }
      const users = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: conseillerUser._id },
          { $set: { token: uuidv4(), tokenCreatedAt: new Date() } },
          { returnOriginal: false },
        );
      const mailerInstance = mailer(app);
      const message = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('creationCompteCandidat');
      const errorSmtpMail = await message
        .send(users)
        .catch((errSmtp: Error) => {
          return errSmtp;
        });
      if (errorSmtpMail instanceof Error) {
        res.status(503).json({ message: errorSmtpMail.message });
      } else {
        res
          .status(200)
          .json(
            `Le candidat ${users.name} a bien reçu un nouveau mail d'activation`,
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
