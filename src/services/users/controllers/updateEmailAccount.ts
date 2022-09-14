import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import mailer from '../../../mailer';
import emails from '../../../emails/emails';
import { updateEmail } from '../../../schemas/users.schemas';

const updateEmailAccount =
  (app: Application) => async (req: IRequest, res: Response) => {
    const nouveauEmail: string = req.body.name;
    const idUser: string = req.params.id;
    const emailValidation = updateEmail.validate(nouveauEmail);

    try {
      const verificationEmail = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.read)
        .countDocuments({ name: nouveauEmail });
      if (verificationEmail !== 0) {
        res.statusMessage = `l'email ${nouveauEmail} est déjà utilisé`;
        res.status(409).end();
        return;
      }
      if (emailValidation.error) {
        res.statusMessage = emailValidation.error.message;
        res.status(400).end();
        return;
      }
      const user = await app
        .service(service.users)
        .Model.accessibleBy(req.ability, action.update)
        .findOneAndUpdate(
          { _id: idUser },
          { $set: { token: uuidv4(), mailAModifier: nouveauEmail } },
          { returnOriginal: false },
        );
      user.nouveauEmail = nouveauEmail;
      const mailerInstance = mailer(app);
      const message = emails(
        app,
        mailerInstance,
        req,
      ).getEmailMessageByTemplateName('confirmeNouveauEmail');
      await message.send(user);
      res.send(user);
    } catch (error) {
      if (error.name === 'ForbiddenError') {
        res.statusMessage = 'Accès refusé';
        res.status(403).end();
        return;
      }
      res.statusMessage = error.message;
      res.status(500).end();
      throw new Error(error);
    }
  };

export default updateEmailAccount;
