import { Application } from '@feathersjs/express';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

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
  const formatNom = nom?.trim();
  if (/^[0-9]{14}$/.test(formatNom)) {
    return { siret: { $eq: nom } };
  }
  if (/^[a-zA-Z0-9-._]+@[a-zA-Z0-9-._]{2,}[.][a-zA-Z]{2,3}$/i.test(formatNom)) {
    return { 'contact.email': { $eq: nom } };
  }
  if (/^\d+$/.test(formatNom)) {
    return { idPG: { $eq: parseInt(nom, 10) } };
  }
  if (formatNom) {
    return {
      nom: { $regex: `(?'name'${formatNom}.*$)`, $options: 'i' },
    };
  }
  return {};
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

const filterSortColonne = (nomOrdre: string, ordre: number) => {
  if (nomOrdre === 'idPG') {
    return JSON.parse(`{"${nomOrdre}":${ordre}}`);
  }
  // Pour éviter le problème de pagination sur une colonne qui peut contenir des valeurs communes
  return JSON.parse(`{"${nomOrdre}":${ordre}, "idPG": 1}`);
};

const formatQpv = (qpv: string) => (qpv === 'Oui' ? 'Oui' : 'Non');

const formatType = (type: string) => (type === 'PRIVATE' ? 'Privée' : 'Public');

const getNameStructure =
  (app: Application, req: IRequest) => async (idStructure: number) =>
    app
      .service(service.structures)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ idPG: idStructure })
      .select({ nom: 1, _id: 0 });

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
  formatType,
  filterSortColonne,
  getNameStructure,
};
