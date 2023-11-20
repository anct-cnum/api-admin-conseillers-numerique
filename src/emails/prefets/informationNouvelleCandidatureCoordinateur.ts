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
              'demandesCoordinateur.$.mailSentDate': new Date(),
            },
            $unset: {
              'demandesCoordinateur.$.mailErrorSentDate': '',
              'demandesCoordinateur.$.mailErrorDetailSentDate': '',
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
            'demandesCoordinateur.$.mailErrorSent': 'smtpError',
            'demandesCoordinateur.$.mailErrorDetailSent': err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structureWithPrefets.name, {
          subject:
            'Réponse à candidature : recrutement de Conseiller(s) numérique(s) France Services',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
