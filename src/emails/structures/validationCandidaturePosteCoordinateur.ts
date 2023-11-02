import { IStructures } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'validationCandidaturePosteCoordinateur';

  const render = async (typeStructure: string) => {
    const nombreCoordinateursCoselec = 1;
    return mailer.render(__dirname, templateName, {
      typeStructure,
      nombreCoordinateursCoselec,
    });
  };

  return {
    render,
    send: async (structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature d’un recrutement de Conseiller numérique Coordinateur à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Réponse à candidature : recrutement d’un Conseiller numérique Coordinateur',
          body: await render(structure.type),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
