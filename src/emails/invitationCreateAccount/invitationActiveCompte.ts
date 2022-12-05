import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { action } from '../../helpers/accessControl/accessList';

export default function (app: Application, mailer, req: IRequest) {
  const templateName = 'invitationActiveCompte';
  const { utils } = mailer;

  const render = async (user: IUser) => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getDashboardUrl(`/invitation/${user.token}`),
    });
  };

  return {
    templateName,
    render,
    send: async (user) => {
      const onSuccess = async () => {
        if (req === null) {
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
        } else {
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
        }
      };
      const onError = async (err: Error) => {
        if (req === null) {
          await app.service(service.users).Model.updateOne(
            { _id: user._id },
            {
              mailError: 'smtpError',
              mailErrorDetail: err.message,
            },
          );
        } else {
          await app
            .service(service.users)
            .Model.accessibleBy(req.ability, action.update)
            .updateOne(
              { _id: user._id },
              {
                mailError: 'smtpError',
                mailErrorDetail: err.message,
              },
            );
        }
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Bienvenue sur votre nouveau tableau de pilotage Conseiller numérique France Services',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
