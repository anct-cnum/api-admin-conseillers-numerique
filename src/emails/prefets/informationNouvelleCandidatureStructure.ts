import { Application } from '@feathersjs/express';
import service from '../../helpers/services';

export default function (app: Application, mailer) {
  const templateName = 'informationNouvelleCandidatureStructure';

  const render = async (nomStructure: string) => {
    return mailer.render(__dirname, templateName, {
      nomStructure,
      mail: app.get('smtp').replyTo,
    });
  };

  return {
    render,
    send: async (prefetWithStructure) => {
      const onSuccess = async () => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: prefetWithStructure.structure._id,
          },
          {
            $set: {
              mailSendDatePrefet: new Date(),
            },
            $unset: {
              mailErrorSentDatePrefet: '',
              mailErrorDetailSentDatePrefet: '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: prefetWithStructure.structure._id,
          },
          {
            mailErrorSentPrefet: 'smtpError',
            mailErrorDetailSentPrefet: err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(prefetWithStructure.name, {
          subject: 'Nouvelle candidature Conseiller numérique',
          body: await render(prefetWithStructure.structure.nom),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
