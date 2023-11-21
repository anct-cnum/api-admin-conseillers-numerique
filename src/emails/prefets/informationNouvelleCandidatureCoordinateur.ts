import { Application } from '@feathersjs/express';
import service from '../../helpers/services';

export default function (app: Application, mailer) {
  const templateName = 'informationNouvelleCandidatureCoordinateur';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (structureWithPrefets) => {
      const onSuccess = async () => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: structureWithPrefets.structureFormat._id,
            demandesCoordinateur: {
              $elemMatch: {
                id: {
                  $eq: structureWithPrefets.structureFormat
                    .demandesCoordinateur[0].id,
                },
              },
            },
          },
          {
            $set: {
              'demandesCoordinateur.$.mailSendDatePrefet': new Date(),
            },
            $unset: {
              'demandesCoordinateur.$.mailErrorSentDatePrefet': '',
              'demandesCoordinateur.$.mailErrorDetailSentDatePrefet': '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.structures).Model.updateOne(
          {
            _id: structureWithPrefets.structureFormat._id,
            demandesCoordinateur: {
              $elemMatch: {
                id: {
                  $eq: structureWithPrefets.structureFormat
                    .demandesCoordinateur[0].id,
                },
              },
            },
          },
          {
            'demandesCoordinateur.$.mailErrorSentPrefet': 'smtpError',
            'demandesCoordinateur.$.mailErrorDetailSentPrefet': err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structureWithPrefets.name, {
          subject:
            'Nouvelle candidature pour un poste de Conseiller numérique coordinateur',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
