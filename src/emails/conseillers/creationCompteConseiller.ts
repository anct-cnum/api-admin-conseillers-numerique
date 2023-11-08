import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const { utils } = mailer;
  const templateName = 'creationCompteConseiller';

  const render = async (user: IUser) => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCoopUrl(`/inscription/${user.token}`),
    });
  };

  return {
    render,
    send: async (user) => {
      const onSuccess = async () => {
        await app.service(service.users).Model.updateOne(
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
        await app.service(service.users).Model.updateOne(
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
            'Veuillez activer votre compte Coop des conseillers numériques',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
