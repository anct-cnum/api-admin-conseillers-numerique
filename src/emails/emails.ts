import { Application } from '../declarations';
import { IRequest } from '../ts/interfaces/global.interfaces';
import invitationActiveCompte from './invitationCreateAccount/invitationActiveCompte';
import conseillerRupturePix from './pix/conseillerRupturePix';
import conseillerRuptureStructure from './structures/conseillerRuptureStructure';

export default function (app: Application, mailer, req: IRequest = null) {
  const emails = [
    invitationActiveCompte(app, mailer, req),
    conseillerRupturePix(mailer),
    conseillerRuptureStructure(app, mailer, req),
  ];
  return {
    getEmailMessageByTemplateName: (name: string) => {
      return emails.find(
        (email: { templateName: string }) => email.templateName === name,
      );
    },
  };
}
