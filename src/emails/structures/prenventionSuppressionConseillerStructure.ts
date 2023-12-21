import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'prenventionSuppressionConseillerStructure';

  const render = async () => {
    return mailer.render(__dirname, templateName);
  };

  return {
    render,
    send: async (conseillerIdPG, structureEmail) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour prévenir de la suppression du conseiller idPG ${conseillerIdPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(
          structureEmail,
          {
            subject: 'Votre conseiller arrive en fin de contrat',
            body: await render(),
          },
          {},
          utils.getPixSupportMail(),
        )
        .then(onSuccess)
        .catch(onError);
    },
  };
}
