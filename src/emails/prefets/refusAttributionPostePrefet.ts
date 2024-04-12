import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'refusAttributionPostePrefet';

  const render = async (nomStructure: string, idStructure: number) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      idStructure,
    });
  };

  return {
    render,
    send: async (user: IUser, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature défavorable d’une demande de poste(s) supplémentaire(s) au préfet ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Conseiller numérique - Demande de poste(s) supplémentaire(s) - décision défavorable',
          body: await render(structure.nom, structure.idPG),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
