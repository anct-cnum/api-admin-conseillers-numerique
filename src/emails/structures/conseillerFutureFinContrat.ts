import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'conseillerFutureFinContrat';

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    render,
    send: async (conseiller, structure) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour prévenir de la suppression du conseiller ${conseiller.nom} ${conseiller.prenom}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(
          structure.contact.email,
          {
            subject: 'Départ dans 2 mois',
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
