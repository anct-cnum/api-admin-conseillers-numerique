import { Application } from '@feathersjs/express';
import service from '../../helpers/services';
import { action } from '../../helpers/accessControl/accessList';
import { IRequest } from '../../ts/interfaces/global.interfaces';

const countStructures = async (ability, read, app) =>
  app
    .service(service.structures)
    .Model.accessibleBy(ability, read)
    .countDocuments({
      statut: 'VALIDATION_COSELEC',
    });

const getStructuresIds = async (page, limit, ability, read, app) =>
  app
    .service(service.structures)
    .Model.accessibleBy(ability, read)
    .find({
      statut: 'VALIDATION_COSELEC',
    })
    .skip(page)
    .limit(limit);

const checkAccessReadRequestStructures = async (
  app: Application,
  req: IRequest,
) =>
  app
    .service(service.structures)
    .Model.accessibleBy(req.ability, action.read)
    .getQuery();

const filterNomStructure = (nom: string) => {
  return nom ? { nom: { $regex: `(?'name'${nom}.*$)`, $options: 'i' } } : {};
};

const filterRegion = (region: string) => (region ? { codeRegion: region } : {});

const filterDepartement = (departement: string) =>
  departement ? { codeDepartement: departement } : {};

const filterType = (type: string) => {
  if (type === 'Privée') {
    return { type: { $eq: 'PRIVATE' } };
  }
  if (type === 'Publique') {
    return { type: { $ne: 'PRIVATE' } };
  }

  return {};
};

const filterStatut = (statut: string) =>
  statut ? { statut: statut.toUpperCase() } : {};

export {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterNomStructure,
  filterType,
  filterRegion,
  filterStatut,
  countStructures,
  getStructuresIds,
};
