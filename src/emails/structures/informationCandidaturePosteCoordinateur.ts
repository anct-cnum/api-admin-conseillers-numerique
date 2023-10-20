import { IStructures } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'informationCandidaturePosteCoordinateur';

  const render = async (statut: string) => {
    const statutFormat = statut === 'validee' ? 'acceptée' : 'refusée';
    return mailer.render(__dirname, templateName, {
      statutFormat,
    });
  };

  return {
    render,
    send: async (structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour le recrutement d’un conseiller coordinateur à la structure ${structure.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject:
            'Réponse à candidature : recrutement d’un conseiller coordinateur',
          body: await render(structure.demandesCoordinateur[0].statut),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
