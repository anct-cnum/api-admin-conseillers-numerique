import { ObjectId } from 'mongodb';
import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../services';
import app from '../../../app';
import { getConseillersById } from '../../commonQueriesFunctions';

export default async function grandReseauRules(user: IUser, can): Promise<any> {
  // Restreindre les permissions : les grands réseau ne peuvent voir que les informations des structures appartenant à leur organisation
  let structuresIds: ObjectId[];
  try {
    structuresIds = await app
      .service(service.structures)
      .Model.find({ reseau: user.reseau })
      .distinct('_id');
  } catch (error) {
    throw new Error(error);
  }

  const conseillersIds = await getConseillersById(app)(structuresIds);

  can([action.read], ressource.conseillers, {
    structureId: { $in: structuresIds },
  });
  can([action.read], ressource.structures, {
    _id: { $in: structuresIds },
  });
  can([action.read], ressource.misesEnRelation, {
    'conseiller.$id': { $in: conseillersIds },
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
