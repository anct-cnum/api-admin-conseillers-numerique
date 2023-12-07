import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import {
  IMisesEnRelation,
  IStructures,
} from '../../ts/interfaces/db.interfaces';

export default function (app: Application, mailer) {
  const templateName = 'conseillerFinContratStructure';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (miseEnRelation: IMisesEnRelation, structure: IStructures) => {
      const onSuccess = async () => {
        await app.service(service.misesEnRelation).Model.updateOne(
          { _id: miseEnRelation._id },
          {
            $set: {
              mailCnfsFinContratSentDate: new Date(),
              resendMailCnfsFinContrat:
                !!miseEnRelation.resendMailCnfsFinContrat,
            },
            $unset: {
              mailErrorCnfsFinContrat: '',
              mailErrorDetailCnfsFinContrat: '',
            },
          },
        );
      };
      const onError = async (err: Error) => {
        await app.service(service.misesEnRelation).Model.updateOne(
          { _id: miseEnRelation._id },
          {
            $set: {
              mailErrorCnfsFinContrat: 'smtpError',
              mailErrorDetailCnfsFinContrat: err.message,
            },
          },
        );
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structure.contact.email, {
          subject: 'Fin de contrat de votre Conum',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
