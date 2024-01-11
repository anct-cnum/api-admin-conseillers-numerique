import { Application } from '@feathersjs/express';
import logger from '../../logger';

export default function (app: Application, mailer) {
  const templateName = 'informationNouvelleCandidatureStructure';

  const render = async (nomStructure: string) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      mail: app.get('smtp').replyTo,
    });
  };

  return {
    render,
    send: async (prefetWithStructure) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour l'information d'une nouvelle candidature structure au préfet ${prefetWithStructure.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(prefetWithStructure.name, {
          subject: 'Nouvelle candidature Conseiller numérique',
          body: await render(prefetWithStructure.structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
