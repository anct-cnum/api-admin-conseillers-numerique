import { Application } from '@feathersjs/express';

export default function (app: Application, mailer) {
  const templateName = 'bienvenueCompteActive';
  const { utils } = mailer;

  const render = async (user) => {
    return mailer.render(__dirname, templateName, {
      user,
      link: utils.getDashboardUrl(`/login`),
    });
  };

  return {
    templateName,
    render,
    send: async (user) => {
      const onSuccess = () => {};

      const onError = async (err) => {
        utils.setSentryError(err);
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Bienvenue dans le tableau de bord Conseiller Numérique France services',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
