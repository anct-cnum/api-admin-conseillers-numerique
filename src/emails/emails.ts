import { Application } from '../declarations';
import { IRequest } from '../ts/interfaces/global.interfaces';
import confirmeNouveauEmail from './confirmeChangeEmail/confirmeNouveauEmail';
import invitationActiveCompte from './invitationCreateAccount/invitationActiveCompte';
import bienvenueCompteActive from './bienvenueCreateAccount/bienvenueCompteActive';

export default function (app: Application, mailer, req: IRequest) {
  const emails = [
    confirmeNouveauEmail(app, mailer, req),
    invitationActiveCompte(app, mailer, req),
    bienvenueCompteActive(app, mailer),
  ];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
