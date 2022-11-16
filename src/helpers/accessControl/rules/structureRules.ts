import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';
import { getConseillersById } from '../../commonQueriesFunctions';

export default async function structureRules(user: IUser, can): Promise<any> {
  const conseillersIds = await getConseillersById(app)(user?.entity.oid);

  // Restreindre les permissions : les structures ne peuvent voir que les informations les concernant
  can([action.read, action.update], ressource.structures, {
    _id: user?.entity.oid,
  });
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.misesEnRelation, {
    'structure.$id': user?.entity.oid,
  });
  // Restreindre les permissions : les structures ne peuvent voir que les conseillers appartenant à leur organisation
  // Attention ils doivent pouvoir voir tous les candidats
  can([action.read, action.update], ressource.conseillers, {
    structureId: user?.entity.oid,
  });

  can([action.read, action.create, action.delete], ressource.users, {
    'entity.$id': user?.entity.oid,
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
