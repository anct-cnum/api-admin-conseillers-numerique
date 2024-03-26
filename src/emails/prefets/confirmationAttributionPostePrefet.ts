import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'confirmationAttributionPostePrefet';

  const render = async (
    nomStructure: string,
    idStructure: number,
    nbDePosteAccorder: string,
  ) => {
    return mailer.render(__dirname, templateName, {
      nbDePosteAccorder,
      nomStructure,
      idStructure,
    });
  };

  return {
    render,
    send: async (
      user: IUser,
      structure: IStructures,
      nbDePosteAccorder: string,
    ) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature favorable d'une demande de poste(s) supplémentaire(s) au préfet ${user.name}`,
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
          body: await render(structure.nom, structure.idPG, nbDePosteAccorder),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
