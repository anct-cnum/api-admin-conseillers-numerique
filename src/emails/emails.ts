import { Application } from '../declarations';
import { IRequest } from '../ts/interfaces/global.interfaces';
import invitationActiveCompte from './invitationCreateAccount/invitationActiveCompte';

export default function (app: Application, mailer, req: IRequest = null) {
  const emails = [invitationActiveCompte(app, mailer, req)];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
