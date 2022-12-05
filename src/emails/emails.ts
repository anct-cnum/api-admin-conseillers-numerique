import { Application } from '../declarations';
import { IRequest } from '../ts/interfaces/global.interfaces';
import creationCompteCandidat from './candidats/creationCompteCandidat';
import invitationActiveCompte from './invitationCreateAccount/invitationActiveCompte';
import candidatSupprimePix from './pix/candidatSupprimePix';

export default function (app: Application, mailer, req: IRequest) {
  const emails = [
    invitationActiveCompte(app, mailer, req),
    candidatSupprimePix(mailer),
    creationCompteCandidat(app, mailer, req),
  ];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
