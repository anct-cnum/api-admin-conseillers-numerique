import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { IDepartement, IHub } from '../ts/interfaces/json.interface';
import service from './services';

const hubs = require('../../datas/imports/hubs.json');
const departements = require('../../datas/imports/departements-region.json');
const departementRegionTom = require('../../datas/imports/departements-region-tom.json');

// Récupération du hub correspondant (département ou région) dans la liste des hubs (fichier hub.json)
const findDepartementOrRegion = (nomHub: string) => {
  return hubs.find((hub: IHub) => `${hub.name}` === nomHub);
};

// Récuperation du departement par le nom de la région dans le tableau des régions du hub
// se trouvant dans le type "hub" du model l'utilisateur
const findNumDepartementsByRegion = (hubRegion: string[]): Array<string> => {
  return departements
    .filter((departement: IDepartement) =>
      hubRegion.includes(departement.region_name),
    )
    .map((departement: IDepartement) => departement.num_dep);
};

const getConseillersById = (app: Application) => async (structuresIds: any) => {
  try {
    const query = Array.isArray(structuresIds)
      ? { $in: structuresIds }
      : { $eq: structuresIds };

    const conseillersIds: ObjectId[] = await app
      .service(service.conseillers)
      .Model.find({ structureId: query })
      .distinct('_id');

    return conseillersIds;
  } catch (error) {
    throw new Error(error);
  }
};

const findRegionNameByNumDepartement = (
  departement: string,
  codeCom: string,
) => {
  if (departement === '00') {
    return departementRegionTom.find(
      (dep: IDepartement) => dep.num_dep === codeCom,
    )?.region_name;
  }
  return departements.find((dep: IDepartement) => dep.num_dep === departement)
    ?.region_name;
};

const findDepartementNameByNumDepartement = (
  departement: string,
  codeCom: string,
) => {
  if (departement === '00') {
    return departementRegionTom.find(
      (dep: IDepartement) => dep.num_dep === codeCom,
    )?.dep_name;
  }
  return departements.find((dep: IDepartement) => dep.num_dep === departement)
    ?.dep_name;
};

export {
  findDepartementOrRegion,
  findNumDepartementsByRegion,
  getConseillersById,
  findRegionNameByNumDepartement,
  findDepartementNameByNumDepartement,
};
