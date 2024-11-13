import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { action } from '../../helpers/accessControl/accessList';

export default function (app: Application, mailer, req: IRequest) {
  const { utils } = mailer;
  const templateName = 'creationCompteConseiller';

  const render = async () => {
    return mailer.render(__dirname, templateName, {
      link: utils.getEspaceCoopUrl(''),
    });
  };

  return {
    render,
    send: async (user) => {
      const onSuccess = async () => {
        await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: user._id },
            {
              $set: {
                mailSentDate: new Date(),
                resend: !!user.mailSentDate,
              },
              $unset: {
                mailError: '',
                mailErrorDetail: '',
              },
            },
          );
      };
      const onError = async (err: Error) => {
        await app
          .service(service.users)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: user._id },
            {
              $set: {
                mailError: 'smtpError',
                mailErrorDetail: err.message,
              },
            },
          );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Bienvenue parmi les Conseillers Numériques',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
