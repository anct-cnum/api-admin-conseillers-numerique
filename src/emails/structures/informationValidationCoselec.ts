import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import { getCoselec } from '../../utils';

export default function (app: Application, mailer) {
  const templateName = 'informationValidationCoselec';

  const render = async (user: IUser) => {
    const structure: IStructures = await app
      .service(service.structures)
      .Model.findOne({ _id: user.entity.oid });
    const coselec = getCoselec(structure);
    const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;

    return mailer.render(__dirname, templateName, {
      structure,
      nombreConseillersCoselec,
    });
  };

  return {
    render,
    send: async (user: IUser) => {
      const onSuccess = async () => {
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            $set: {
              mailSentInformationCoselecDate: new Date(),
            },
            $unset: {
              mailErrorSentInformationCoselec: '',
              mailErrorDetailSentInformationCoselec: '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            mailErrorSentInformationCoselec: 'smtpError',
            mailErrorDetailSentInformationCoselec: err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Réponse à candidature : recrutement de Conseiller(s) numérique(s) France Services',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
