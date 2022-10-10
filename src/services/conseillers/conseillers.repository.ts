import { Application } from '@feathersjs/express';
import { action } from '../../helpers/accessControl/accessList';
import service from '../../helpers/services';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const checkAccessReadRequestConseillers = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.conseillers)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterNom = (nom: string) =>
  nom ? { $text: { $search: `"${nom}"` } } : {};

const filterIsCoordinateur = (coordinateur: string) => {
  if (coordinateur === 'true') {
    return { estCoordinateur: { $eq: true } };
  }
  if (coordinateur === 'false') {
    return { estCoordinateur: { $exists: false } };
  }

  return {};
};

const filterIsRupture = (rupture: string) => {
  if (rupture === 'true') {
    return { estCoordinateur: { $eq: true } };
  }
  if (rupture === 'false') {
    return { estCoordinateur: { $exists: false } };
  }

  return {};
};

export {
  checkAccessReadRequestConseillers,
  filterIsCoordinateur,
  filterNom,
  filterIsRupture,
};
