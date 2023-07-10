import { IUser } from '../../ts/interfaces/db.interfaces';
import logger from '../../logger';

export default function (mailer) {
  const templateName = 'invitationMultiRoleCompte';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (user: IUser) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour l'invitation du multi-compte de l'utilisateur ${user.name}`,
        );
      };
      const onError = async (err: Error) => {
        logger.info(err.message);
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject: 'Votre accès multi-compte Tableau de pilotage CnFS',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
