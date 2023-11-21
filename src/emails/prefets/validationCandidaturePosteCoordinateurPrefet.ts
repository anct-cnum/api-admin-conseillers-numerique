import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'validationCandidaturePosteCoordinateurPrefet';

  const render = async (typeStructure: string, nomStructure: string) => {
    const nombreCoordinateursCoselec = 1;
    return mailer.render(__dirname, templateName, {
      nombreCoordinateursCoselec,
      typeStructure,
      nomStructure,
    });
  };

  return {
    render,
    send: async (user: IUser, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature favorable d’un recrutement de Conseiller numérique Coordinateur au préfet ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Appel à candidature Conseiller numérique coordinateur - attribution de poste',
          body: await render(structure.type, structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
