import logger from '../../logger';

export default function (mailer) {
  const templateName = 'conseillerRupturePix';
  const { utils } = mailer;

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, { conseiller });
  };

  return {
    templateName,
    render,
    send: async (conseiller) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé à PIX avec succès pour la suppression du conseiller ${conseiller.nom} ${conseiller.prenom}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(utils.getPixContactMail(), {
          subject: 'Conseiller en rupture de contrat',
          body: await render(conseiller),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
