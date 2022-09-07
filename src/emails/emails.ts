import { Application } from '../declarations';
import { IRequest } from '../ts/interfaces/global.interfaces';
import confirmeNouveauEmail from './confirmeChangeEmail/confirmeNouveauEmail';

export default function (app: Application, mailer, req: IRequest) {
  const emails = [confirmeNouveauEmail(app, mailer, req)];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
