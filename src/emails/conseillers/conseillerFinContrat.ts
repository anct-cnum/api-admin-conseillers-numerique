import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'conseillerFinContrat';

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    render,
    send: async (conseiller) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour prévenir de la suppression définitive du conseiller ${conseiller.nom} ${conseiller.prenom}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(
          conseiller.email,
          {
            subject: 'Au revoir',
            body: await render(conseiller),
          },
          {},
          utils.getPixSupportMail(),
        )
        .then(onSuccess)
        .catch(onError);
    },
  };
}
