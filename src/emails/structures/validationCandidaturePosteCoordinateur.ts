import { Application } from '@feathersjs/express';
import { IStructures } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (app: Application, mailer) {
  const templateName = 'validationCandidaturePosteCoordinateur';

  const render = async (typeStructure: string, numeroDossierDS: number) => {
    const nombreCoordinateursCoselec = 1;
    const demarcheSimplifiee = app.get('demarche_simplifiee');
    const lienVersDossierDSCoordinateur = `https://www.demarches-simplifiees.fr/procedures/${demarcheSimplifiee?.numero_demarche_recrutement_coordinateur}/dossiers/${numeroDossierDS}/messagerie`;

    return mailer.render(__dirname, templateName, {
      typeStructure,
      nombreCoordinateursCoselec,
      lienVersDossierDSCoordinateur,
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
          body: await render(
            structure.type,
            structure.demandesCoordinateur[0].dossier.numero,
          ),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
