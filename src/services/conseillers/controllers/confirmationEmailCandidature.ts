import { Application } from '@feathersjs/express';
import { Response, Request } from 'express';
import service from '../../../helpers/services';

const confirmationEmailCandidature =
  (app: Application) => async (request: Request, response: Response) => {
    try {
      const result = await app
        .service(service.conseillers)
        .Model.updateOne(
          { emailConfirmationKey: request.params.id },
          { $set: { emailConfirmedAt: new Date() } },
        );
      if (result.modifiedCount === 0) {
        return response
          .status(403)
          .json({
            message:
              'Impossible de valider l’email, le lien a expiré ou est invalide.',
          })
          .end();
      }
      return response
        .status(200)
        .json(
          'Votre email a été confirmé et votre inscription est maintenant active. Vous serez contacté par mail ou par téléphone si une structure est intéressée par votre profil.',
        )
        .end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default confirmationEmailCandidature;
