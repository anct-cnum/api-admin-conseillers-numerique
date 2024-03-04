import logger from '../../logger';

export default function (mailer) {
  const templateName = 'preventionSuppressionConseiller';
  const { utils } = mailer;

  const render = async (conseiller, dateFinDeContrat) => {
    return mailer.render(__dirname, templateName, {
      prenom: conseiller.prenom[0].toUpperCase() + conseiller.prenom.slice(1),
      dateFinDeContrat,
      link: utils.getQuestionFinContratUrl(),
      espaceCandidat: utils.getEspaceCandidatUrl('/login'),
      emailSupport: utils.getSupportMail(),
      documentAvenir: utils.getDocumentPreparerSonAvenir(),
      demarcheRenouvellement: utils.getAideConseillerNumeriqueUrl(
        'article/faire-une-demande-de-re-conventionnement-bemki2/',
      ),
      seRendreDisponible: utils.getAideConseillerNumeriqueUrl(
        'article/se-rendre-disponible-pour-une-nouvelle-mission-vbd2n0/',
      ),
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
          subject: 'Suppression de votre accès Coop',
          body: await render(conseiller, dateFinDeContrat),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
