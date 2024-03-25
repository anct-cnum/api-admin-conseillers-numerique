import { Application } from '@feathersjs/express';
import logger from '../../logger';
import { IStructures } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'confirmationAttributionPoste';

  const render = async (nbDePosteAccorder: string) => {
    return mailer.render(__dirname, templateName, {
      nbDePosteAccorder,
      mail: app.get('smtp').replyTo,
    });
  };

  return {
    render,
    send: async (structure: IStructures, nbDePosteAccorder: string) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à la demande de poste(s) supplémentaire(s) validée à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Conseiller numérique - Demande de poste(s) supplémentaire(s) validée',
          body: await render(nbDePosteAccorder),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
