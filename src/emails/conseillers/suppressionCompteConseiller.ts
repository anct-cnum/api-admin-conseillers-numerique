import logger from '../../logger';

export default function (mailer) {
  const templateName = 'suppressionCompteConseiller';
  const { utils } = mailer;

  const render = async (conseiller) => {
    return mailer.render(__dirname, templateName, {
      prenom: conseiller.prenom,
      link: utils.getQuestionFinContratUrl(),
      documentAvenir: utils.getDocumentPreparerSonAvenir(),
      emailSupport: utils.getSupportMail(),
    });
  };

  return {
    render,
    send: async (conseiller) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès pour la suppression du compte du conseiller id ${conseiller.idPG}`,
        );
      };
      const onError = async (err: Error) => {
        throw err;
      };

      return mailer
        .createMailer()
        .sendEmail(conseiller.email, {
          subject: 'Vos accès Coop ont été supprimés',
          body: await render(conseiller),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
