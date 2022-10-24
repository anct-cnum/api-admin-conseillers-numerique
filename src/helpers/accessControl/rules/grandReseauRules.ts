import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../services';
import app from '../../../app';

export default async function grandReseauRules(user: IUser, can): Promise<any> {
  // Restreindre les permissions : les grands réseau ne peuvent voir que les informations des structures appartenant à leur organisation
  let structuresIds: string[];
  try {
    structuresIds = await app
      .service(service.structures)
      .Model.find({ reseau: user.reseau })
      .distinct('_id');
  } catch (error) {
    throw new Error(error);
  }

  let conseillersIds: string[];
  try {
    conseillersIds = await app
      .service(service.conseillers)
      .Model.find({ structureId: { $in: structuresIds } })
      .distinct('_id');
  } catch (error) {
    throw new Error(error);
  }

  can([action.read], ressource.conseillers, {
    structureId: { $in: structuresIds },
  });
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.cras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
  can([action.read], ressource.statsConseillersCras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
  can([action.read], ressource.statsTerritoires);
}
