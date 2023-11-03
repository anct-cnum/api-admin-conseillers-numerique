import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'avisCandidaturePosteCoordinateurPrefet';

  const render = async (statut: string, nomStructure: string) => {
    const statutFormat = statut === 'validee' ? 'acceptée' : 'refusée';
    return mailer.render(__dirname, templateName, {
      statutFormat,
      nomStructure,
    });
  };

  return {
    render,
    send: async (user: IUser, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la réponse à candidature d’un recrutement de Conseiller numérique Coordinateur au préfet ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Réponse à candidature : recrutement d’un Conseiller numérique Coordinateur',
          body: await render(
            structure.demandesCoordinateur[0].statut,
            structure.nom,
          ),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
