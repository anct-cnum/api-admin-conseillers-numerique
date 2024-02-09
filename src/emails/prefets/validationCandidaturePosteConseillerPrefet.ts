import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'validationCandidaturePosteConseillerPrefet';

  const render = async (
    nombreConseillersCoselec: number,
    nomStructure: string,
  ) => {
    return mailer.render(__dirname, templateName, {
      nombreConseillersCoselec,
      nomStructure,
    });
  };

  return {
    render,
    send: async (user: IUser, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature favorable d’un recrutement de Conseiller numérique au préfet ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Candidature au poste de conseiller numérique - attribution de poste',
          body: await render(
            structure.coselec[0].nombreConseillersCoselec,
            structure.nom,
          ),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
