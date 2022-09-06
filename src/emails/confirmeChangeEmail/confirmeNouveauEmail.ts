import { Application } from '@feathersjs/express';
import { IUser } from '../../ts/interfaces/db.interfaces';
import service from '../../helpers/services';

export default function (app: Application, mailer) {
  const templateName = 'confirmeNouveauEmail';
  const { utils } = mailer;

  const render = async (user: IUser) => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getDashboardUrl(`/confirmation-email/${user.token}`),
    });
  };

  return {
    templateName,
    render,
    send: async (user) => {
      const onSuccess = () => {
        return app.service(service.users).Model.findOneAndUpdate(
          { _id: user._id },
          {
            $unset: {
              mailConfirmError: '',
              mailConfirmErrorDetail: '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.users).Model.findOneAndUpdate(
          { _id: user._id },
          {
            mailConfirmError: 'smtpError',
            mailConfirmErrorDetail: err.message,
          },
        );
        utils.setSentryError(err);
        throw err;
      };
      return mailer
        .createMailer()
        .sendEmail(user.nouveauEmail, {
          subject: 'Confirmez votre nouvelle adresse mail',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
