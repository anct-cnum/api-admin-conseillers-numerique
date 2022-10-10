import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../services';
import app from '../../../app';

const getConseillersIds = async (user: IUser) => {
  const conseillersIds = [];
  try {
    const conseillersStructure = await app
      .service(service.conseillers)
      .Model.find({
        structureId: user?.entity.oid,
      });
    conseillersStructure.forEach((conseiller) => {
      conseillersIds.push(conseiller._id);
    });
    return conseillersIds;
  } catch (error) {
    throw new Error(error);
  }
};
export default async function structureRules(user: IUser, can): Promise<any> {
  const conseillersIds = await getConseillersIds(user);
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
  can([action.read, action.update], ressource.conseillers, {
    structureId: user?.entity.oid,
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
  // Les structures peuvent voir tous les candidats
  can([action.read], ressource.conseillers);
}
