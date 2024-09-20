import { Application } from '@feathersjs/express';
import { Response, Request } from 'express';
import service from '../../../helpers/services';

const confirmationEmailCandidatureStructure =
  (app: Application) => async (request: Request, response: Response) => {
    try {
      const result = await app
        .service(service.structures)
        .Model.updateOne(
          { emailConfirmationKey: request.params.id },
          { $set: { emailConfirmedAt: new Date() } },
        );
      if (result.modifiedCount === 0) {
        return response
          .status(403)
          .json({
            message:
              'Impossible de valider l’e-mail, le lien a expiré ou est invalide.',
          })
          .end();
      }
      return response
        .status(200)
        .json(
          'Votre email a été confirmé et votre inscription est maintenant active.Vous recevrez un mail d’activation de votre espace structure lorsque votre candidature aura été validée.',
        )
        .end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default confirmationEmailCandidatureStructure;
