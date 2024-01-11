import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'prenventionSuppressionConseillerStructure';

  const render = async () => {
    return mailer.render(__dirname, templateName, {
      emailSupport: utils.getSupportMail(),
    });
  };

  return {
    render,
    send: async (conseillerIdPG, structureIdPG, structureEmail) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé à la structure idPG ${structureIdPG}) avec succès pour prévenir de la suppression du conseiller idPG ${conseillerIdPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(structureEmail, {
          subject: 'Votre conseiller arrive en fin de contrat',
          body: await render(),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
