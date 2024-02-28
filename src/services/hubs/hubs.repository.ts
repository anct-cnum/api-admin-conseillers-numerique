import { Application } from '@feathersjs/express';
import { IRequest } from '../../ts/interfaces/global.interfaces';
import { IHubs, IStructures } from '../../ts/interfaces/db.interfaces';
import service from '../../helpers/services';
import { action } from '../../helpers/accessControl/accessList';

const departements = require('../../../datas/imports/departements-region.json');

const getHubByStructure =
  (app: Application, req: IRequest) =>
  async (structure: IStructures): Promise<IHubs | null> => {
    const regionName: string = departements.find(
      (departement) => `${departement.num_dep}` === structure.codeDepartement,
    )?.region_name;
    let hub = await app
      .service(service.hubs)
      .Model.accessibleBy(req.ability, action.read)
      .findOne({ region_names: { $elemMatch: { $eq: regionName } } });
    if (hub === null) {
      // Cas Saint Martin => on les regroupe au hub Antilles-Guyane
      if (structure.codeDepartement === '00' && structure.codeCom === '978') {
        hub = await app
          .service(service.hubs)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({ departements: { $elemMatch: { $eq: '973' } } });
      } else {
        hub = await app
          .service(service.hubs)
          .Model.accessibleBy(req.ability, action.read)
          .findOne({
            departements: {
              $elemMatch: { $eq: `${structure.codeDepartement}` },
            },
          });
      }
    }
    return hub;
  };

export default getHubByStructure;
