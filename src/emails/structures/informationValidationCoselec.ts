import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IStructures, IUser } from '../../ts/interfaces/db.interfaces';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { getCoselec } from '../../utils';
import logger from '../../logger';

export default function (app: Application, mailer, req: IRequest = null) {
  const templateName = 'informationValidationCoselec';

  const render = async (user: IUser) => {
    const structure: IStructures = await app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ _id: user.entity.oid });
    const coselec = getCoselec(structure);
    const nombreConseillersCoselec = coselec?.nombreConseillersCoselec ?? 0;

    return mailer.render(__dirname, templateName, {
      structure,
      nombreConseillersCoselec,
    });
  };

  return {
    render,
    send: async (user: IUser) => {
      const onSuccess = async () => {
        logger.info(
          `Email envoyé avec succès à ${user.name}, pour informer la structure du nombre de postes obtenus de l'utilisateur`,
        );
      };
      const onError = async (err: Error) => {
        logger.info(err.message);
      };

      return mailer
        .createMailer()
        .sendEmail(user.name, {
          subject:
            'Bonne nouvelle, vous avez obtenu des postes pour recruter des conseillers Numériques France Services !',
          body: await render(user),
        })
        .then(onSuccess)
        .catch(onError);
    },
  };
}
