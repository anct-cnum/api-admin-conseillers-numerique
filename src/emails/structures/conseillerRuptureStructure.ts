import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { action } from '../../helpers/accessControl/accessList';
import {
  IMisesEnRelation,
  IStructures,
} from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer, req: IRequest) {
  const render = async () => {
    return mailer.render(__dirname);
  };

  return {
    render,
    send: async (miseEnRelation: IMisesEnRelation, structure: IStructures) => {
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
        .sendEmail(structure.contact.email, {
          subject: 'Demande de rupture de contrat avec votre CnFS',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
