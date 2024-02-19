import logger from '../../logger';

export default function (mailer) {
  const templateName = 'preventionSuppressionConseiller';
  const { utils } = mailer;

  const render = async (conseiller, dateFinDeContrat) => {
    return mailer.render(__dirname, templateName, {
      prenom: conseiller.prenom,
      dateFinDeContrat,
      link: utils.getQuestionFinContratUrl(),
      espaceCandidat: utils.getEspaceCandidatUrl(),
      emailSupport: utils.getSupportMail(),
    });
  };

  return {
    render,
    send: async (conseiller, dateFinDeContrat) => {
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
          body: await render(conseiller, dateFinDeContrat),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
