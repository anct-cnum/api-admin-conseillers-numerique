import logger from '../../logger';

export default function (mailer) {
  const { utils } = mailer;
  const templateName = 'candidatSupprimePix';

  const render = async (candidat) => {
    return mailer.render(__dirname, templateName, { candidat });
  };

  return {
    render,
    send: async (candidat) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé à PIX avec succès pour la suppression du candidat ${candidat.nom} ${candidat.prenom}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(utils.getEmailSupport(), {
          subject: "Demande de Suppression d'un candidat",
          body: await render(candidat),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
