import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import logger from '../../logger';

export default function (app: Application, mailer) {
  const templateName = 'informationNouvelleCandidatureConseiller';
  const { utils } = mailer;

  const render = async (nomStructure: string) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      mail: app.get('smtp').replyTo,
      pilotage: utils.utils.getDashboardUrl('/'),
      pilotagePrefet: utils.utils.getDashboardUrl(
        '/prefet/demandes/conseillers',
      ),
    });
  };

  return {
    render,
    send: async (prefetWithStructure) => {
      const onSuccess = async () => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: prefetWithStructure.idStructure,
          },
          {
            $set: {
              'prefet.MailDateDemandePosteSupplementaire': new Date(),
            },
            $unset: {
              'prefet.mailErrorSentDateDemandePosteSupplementaire': '',
              'prefet.mailErrorDetailSentDateDemandePosteSupplementaire': '',
            },
          },
        );
        logger.info(
          `Email envoyé avec succès pour l'information d'une demande de poste(s) supplémentaire(s) au préfet ${prefetWithStructure.name}`,
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: prefetWithStructure.idStructure,
          },
          {
            'prefet.mailErrorSentDateDemandePosteSupplementaire': 'smtpError',
            'prefet.mailErrorDetailSentDateDemandePosteSupplementaire':
              err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(prefetWithStructure.name, {
          subject:
            'Conseiller numérique - demande de poste(s) supplémentaire(s)',
          body: await render(prefetWithStructure.structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
