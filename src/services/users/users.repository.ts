import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { action } from '../../helpers/accessControl/accessList';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestGestionnaires = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.users)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterRole = (role: string) => {
  if (role) {
    if (role === 'tous') {
      return {
        roles: {
          $in: [
            'admin',
            'grandReseau',
            'prefet',
            'hub_coop',
            'coordinateur',
            'structure',
          ],
        },
      };
    }
    return { roles: role };
  }
  return {};
};

const filterNomGestionnaire = (nom: string) => {
  return nom ? { name: { $regex: `(^.*${nom}.*$)`, $options: 'i' } } : {};
};

export {
  checkAccessReadRequestGestionnaires,
  filterRole,
  filterNomGestionnaire,
};
