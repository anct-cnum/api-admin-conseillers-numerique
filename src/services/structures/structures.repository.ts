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
  if (type === 'PRIVATE') {
    return { type: { $eq: 'PRIVATE' } };
  }
  if (type === 'PUBLIC') {
    return { type: { $ne: 'PRIVATE' } };
  }

  return {};
};

const filterComs = (coms: string) => (coms ? { codeCom: coms } : {});

const filterStatut = (statut: string) => (statut ? { statut } : {});

const formatAdresseStructure = (insee) => {
  const adresse = `${insee?.etablissement?.adresse?.numero_voie ?? ''} ${
    insee?.etablissement?.adresse?.type_voie ?? ''
  } ${insee?.etablissement?.adresse?.nom_voie ?? ''} ${
    insee?.etablissement?.adresse?.complement_adresse
      ? `${insee.etablissement.adresse.complement_adresse} `
      : ' '
  }${insee?.etablissement?.adresse?.code_postal ?? ''} ${
    insee?.etablissement?.adresse?.localite ?? ''
  }`;

  return adresse.replace(/["']/g, '');
};

const formatQpv = (qpv: string) => (qpv === 'Oui' ? 'Oui' : 'Non');

export {
  checkAccessReadRequestStructures,
  filterDepartement,
  filterNomStructure,
  filterType,
  filterRegion,
  filterStatut,
  countStructures,
  getStructuresIds,
  filterComs,
  formatAdresseStructure,
  formatQpv,
};
