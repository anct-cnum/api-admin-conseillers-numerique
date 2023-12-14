import { Application } from '@feathersjs/express';
import logger from '../../logger';
import {
  IMisesEnRelation,
  IStructures,
} from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'suppressionCompteConseillerStructure';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (miseEnRelation: IMisesEnRelation, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la suppression du conseiller idPG ${miseEnRelation.conseillerObj.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject: 'Fin de contrat de votre Conum',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
