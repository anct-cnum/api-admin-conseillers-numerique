import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { action } from '../../helpers/accessControl/accessList';

export default function (app: Application, mailer, req: IRequest) {
  const templateName = 'creationCompteCandidat';
  const { utils } = mailer;

  const render = async (user: IUser) => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getEspaceCandidatUrl(`/inscription/${user.token}`),
    });
  };

  return {
    templateName,
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
              mailError: 'smtpError',
              mailErrorDetail: err.message,
            },
          );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Activer votre espace candidat Conseillers numériques France Services',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
