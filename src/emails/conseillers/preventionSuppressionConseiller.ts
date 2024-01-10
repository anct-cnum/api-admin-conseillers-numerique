import logger from '../../logger';

export default function (mailer) {
  const templateName = 'preventionSuppressionConseiller';
  const { utils } = mailer;

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      link: utils.getQuestionFinContratUrl(),
      emailSupport: utils.getSupportMail(),
    });
  };

  return {
    render,
    send: async (conseiller) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour prévenir de la suppression du conseiller idPG ${conseiller.idPG} dans 2 mois`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(conseiller.email, {
          subject: 'Départ dans 2 mois',
          body: await render(conseiller),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
