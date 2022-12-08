import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IMisesEnRelation } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { action } from '../../helpers/accessControl/accessList';

export default function (app: Application, mailer, req: IRequest) {
  const templateName = 'conseillerRuptureStructure';

  const render = async (miseEnRelation: IMisesEnRelation) => {
    return mailer.render(__dirname, templateName, {
      miseEnRelation,
    });
  };

  return {
    templateName,
    render,
    send: async (miseEnRelation) => {
      const onSuccess = async () => {
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: miseEnRelation._id },
            {
              $set: {
                mailCnfsRuptureSentDate: new Date(),
                resendMailCnfsRupture: !!miseEnRelation.resendMailCnfsRupture,
              },
              $unset: {
                mailErrorCnfsRupture: '',
                mailErrorDetailCnfsRupture: '',
              },
            },
          );
      };
      const onError = async (err: Error) => {
        await app
          .service(service.misesEnRelation)
          .Model.accessibleBy(req.ability, action.update)
          .updateOne(
            { _id: miseEnRelation._id },
            {
              $set: {
                mailErrorCnfsRupture: 'smtpError',
                mailErrorDetailCnfsRupture: err.message,
              },
            },
          );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(miseEnRelation.structureObj.contact.email, {
          subject: 'Demande de rupture de contrat avec votre CnFS',
          body: await render(miseEnRelation),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
