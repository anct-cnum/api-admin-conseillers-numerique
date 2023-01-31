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
  if (role === 'ROLE_TOUS') {
    return {
      roles: {
        $in: [
          'admin',
          'grandReseau',
          'prefet',
          'hub_coop',
          'coordinateur_coop',
          'structure',
        ],
      },
    };
  }
  if (role === 'ROLE_ADMIN') {
    return { roles: 'admin' };
  }
  if (role === 'ROLE_GRAND_RESEAU') {
    return { roles: 'grandReseau' };
  }
  if (role === 'ROLE_PREFET') {
    return { roles: 'prefet' };
  }
  if (role === 'ROLE_HUB') {
    return { roles: 'hup_coop' };
  }
  if (role === 'ROLE_COORDINATEUR') {
    return { roles: 'coordinateur_coop' };
  }
  if (role === 'ROLE_STRUCTURE') {
    return { roles: 'structure' };
  }

  return {};
};

const filterNomGestionnaire = (nom: string) => {
  return nom ? { nom: { $regex: `(^.*${nom}.*$)`, $options: 'i' } } : {};
};

export {
  checkAccessReadRequestGestionnaires,
  filterRole,
  filterNomGestionnaire,
};
