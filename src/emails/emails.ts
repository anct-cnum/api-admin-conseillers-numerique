import { Application } from '../declarations';
import confirmeNouveauEmail from './confirmeChangeEmail/confirmeNouveauEmail';

export default function (app: Application, mailer) {
  const emails = [confirmeNouveauEmail(app, mailer)];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
