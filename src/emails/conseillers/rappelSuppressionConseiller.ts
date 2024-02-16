import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'rappelSuppressionConseiller';

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, {
      conseiller,
      emailSupport: utils.getSupportMail(),
    });
  };

  return {
    render,
    send: async (conseiller) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la suppression du compte du conseiller id ${conseiller.idPG} dans 7 jours`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(conseiller.email, {
          subject: 'Vos accès Coop seront supprimés dans 7 jours',
          body: await render(conseiller),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
