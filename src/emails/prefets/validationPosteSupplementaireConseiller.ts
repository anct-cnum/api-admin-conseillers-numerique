import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'validationPosteSupplementaireConseiller';

  const render = async (
    nombreConseillersCoselec: number,
    idStructure: number,
    nomStructure: string,
  ) => {
    return mailer.render(__dirname, templateName, {
      nombreConseillersCoselec,
      idStructure,
      nomStructure,
    });
  };

  return {
    render,
    send: async (user: IUser, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse favorable d’une attribution du/des postes de Conseiller numérique au préfet ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Conseiller numérique - Demande de poste(s) supplémentaire(s) - décision favorable',
          body: await render(
            structure.coselec[0].nombreConseillersCoselec,
            structure.idPG,
            structure.nom,
          ),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
