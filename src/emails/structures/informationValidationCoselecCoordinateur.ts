import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const { utils } = mailer;
  const templateName = 'informationValidationCoselecCoordinateur';

  const render = async (user: IUser) => {
    const structure: IStructures = await app
      .service(service.structures)
      .Model.findOne({ _id: user.entity.oid });
    const nombreCoordinateursCoselec = 1;

    return mailer.render(__dirname, templateName, {
      structure,
      nombreCoordinateursCoselec,
      mail: app.get('smtp').replyTo,
      recrutementConseiller: utils.getAideConseillerNumeriqueUrl(
        'article/comment-recruter-un-conseiller-numerique-sur-le-tableau-de-pilotage-9fszjs/',
      ),
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
              mailSentCoselecCoordinateurDate: new Date(),
            },
            $unset: {
              mailErrorSentCoselecCoordinateur: '',
              mailErrorDetailSentCoselecCoordinateur: '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.users).Model.updateOne(
          { _id: user._id },
          {
            mailErrorSentCoselecCoordinateur: 'smtpError',
            mailErrorDetailSentCoselecCoordinateur: err.message,
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Réponse à candidature : recrutement de Conseiller numérique Coordinateur',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
