import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { getCoselec } from '../../utils';

export default function (app: Application, mailer, req: IRequest = null) {
  const { utils } = mailer;
  const templateName = 'invitationActiveCompteStructure';

  const render = async (user: IUser) => {
    const structure: IStructures = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ _id: user.entity.oid });
    const coselec = getCoselec(structure);
    const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;

    return mailer.render(__dirname, templateName, {
      structure,
      nombreConseillersCoselec,
      link: utils.getDashboardUrl(`/invitation/${user.token}`),
    });
  };

  return {
    render,
    send: async (user) => {
      const onSuccess = async () => {
        // Mode Script
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
        // Mode Script
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
