import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../services';
import app from '../../../app';

const getConseillersIds = async (structuresIds) => {
  let conseillersIds: String[];
  try {
    structuresIds.forEach(async (structureId) => {
      const conseillersStructure = await app
        .services(service.conseillers)
        .Model.find({
          structureId,
        });
      conseillersStructure.forEach((conseiller) => {
        conseillersIds.push(conseiller._id);
      });
    });

    return conseillersIds;
  } catch (error) {
    throw new Error(error);
  }
};

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
  const conseillersIds = await getConseillersIds(structuresIds);

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
}
