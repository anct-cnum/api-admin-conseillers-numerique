import { Application } from '@feathersjs/express';
import logger from '../../logger';
import { IStructures } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'refusAttributionPoste';

  const render = async () => {
    return mailer.render(__dirname, templateName, {
      mail: app.get('smtp').replyTo,
    });
  };

  return {
    render,
    send: async (structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à la demande de poste(s) supplémentaire(s) refusée à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Conseiller numérique - Demande de poste(s) supplémentaire(s) refusée',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
