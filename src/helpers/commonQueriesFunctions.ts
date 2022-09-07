import { IDepartement, IHub } from '../ts/interfaces/json.interface';

const hubs = require('../../data/imports/hubs');
const departements = require('../../data/imports/departements-region.json');

//Récupération du hub correspondant (département ou région) dans la liste des hubs (fichier hub.json)
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

export { findDepartementOrRegion, findNumDepartementsByRegion };
