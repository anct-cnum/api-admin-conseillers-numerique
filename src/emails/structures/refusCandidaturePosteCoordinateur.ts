import { IStructures } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'refusCandidaturePosteCoordinateur';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature défavorable d’un recrutement de Conseiller numérique Coordinateur à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Conseiller numérique coordinateur - votre candidature a été examinée',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
