import { Application } from '@feathersjs/express';
import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import { getConseillersById } from '../../commonQueriesFunctions';

export default async function structureRules(
  app: Application,
  user: IUser,
  can: any,
): Promise<any> {
  const conseillersIds = await getConseillersById(app)(user?.entity.oid);

  // Restreindre les permissions : les structures ne peuvent voir que les informations les concernant
  can([action.read, action.update], ressource.structures, {
    _id: user?.entity.oid,
  });
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read, action.update, action.create], ressource.misesEnRelation, {
    'structure.$id': user?.entity.oid,
  });
  // Restreindre les permissions : les structures ne peuvent voir que les conseillers appartenant à leur organisation
  // Attention ils doivent pouvoir voir tous les candidats
  can([action.read, action.update], ressource.conseillers, {
    structureId: user?.entity.oid,
  });
  can([action.read, action.update], ressource.conseillers, {
    'ruptures.structureId': user?.entity.oid,
  });
  can(
    [action.read, action.create, action.update, action.delete],
    ressource.users,
    {
      'entity.$id': user?.entity.oid,
    },
  );

  can([action.read], ressource.cras, {
    'structure.$id': {
      $eq: user?.entity.oid,
    },
  });
  can([action.read], ressource.statsConseillersCras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
  can([action.read], ressource.statsTerritoires);

  can([action.read], ressource.conseillersRuptures, {
    structureId: user?.entity.oid,
  });
}
