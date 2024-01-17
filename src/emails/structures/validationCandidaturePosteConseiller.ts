import { IStructures } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'validationCandidaturePosteConseiller';

  const render = async (nombreCoordinateursCoselec: number) => {
    return mailer.render(__dirname, templateName, {
      nombreCoordinateursCoselec,
    });
  };

  return {
    render,
    send: async (structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature favorable d’un recrutement de Conseiller numérique à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Appel à candidature Conseiller numérique - attribution de poste',
          body: await render(structure.coselec[0].nombreConseillersCoselec),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
