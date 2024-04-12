import { Application } from '@feathersjs/express';
import logger from '../../logger';
import { IStructures } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'demandePosteSupplementaireConseiller';
  const { utils } = mailer;

  const render = async (nomStructure: string) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      mail: app.get('smtp').replyTo,
      pilotage: utils.getDashboardUrl('/'),
      pilotagePrefet: utils.getDashboardUrl('/prefet/demandes/conseillers'),
    });
  };

  return {
    render,
    send: async (mailPrefet: string, structure: IStructures) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour l'information d'une demande de poste(s) supplémentaire(s) au préfet ${mailPrefet}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(mailPrefet, {
          subject:
            'Conseiller numérique - demande de poste(s) supplémentaire(s)',
          body: await render(structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
