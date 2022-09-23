import { action, ressource } from '../accessList';
import { IUser, IStructures } from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';
import service from '../../services';

const getConseillersIds = async (user) => {
  try {
    const conseillersIds = [];
    let query = {};
    if (user?.departement === undefined) {
      query = {
        codeRegion: {
          $in: [String(user?.region)],
        },
      };
    } else {
      query = {
        codeDepartement: {
          $in: [String(user?.departement)],
        },
      };
    }
    const structures: IStructures[] = await app
      .service(service.structures)
      .Model.find(query);
    const promises = [];
    structures?.forEach((structure) => {
      // eslint-disable-next-line
      const p = new Promise(async (resolve) => {
        const conseillersStructure = await app
          .service(service.conseillers)
          .Model.find({
            structureId: structure._id,
          });

        if (conseillersStructure.length > 0) {
          conseillersStructure?.forEach((conseiller) => {
            conseillersIds.push(conseiller._id);
          });
        }
        resolve(conseillersIds);
      });
      promises.push(p);
    });
    await Promise.all(promises);
    return conseillersIds;
  } catch (error) {
    throw new Error(error);
  }
};

export default async function prefetRules(user: IUser, can): Promise<any> {
  const conseillersIds = await getConseillersIds(user);
  // Restreindre les permissions : les prefets ne peuvent voir que les structures de leur departement ou région
  can([action.read], ressource.structures, {
    codeDepartement: String(user?.departement),
  });
  can([action.read], ressource.structures, {
    codeRegion: String(user?.region),
  });
  // Restreindre les permissions : les prefets ne peuvent voir que les conseillers de leur departement ou région
  can([action.read], ressource.conseillers, {
    _id: {
      $in: conseillersIds,
    },
  });
  // Restreindre les permissions : les prefets ne peuvent voir que les misesEnRelation de leur departement ou région
  can([action.read], ressource.misesEnRelation, {
    'structureObj.codeDepartement': String(user?.departement),
  });
  can([action.read], ressource.misesEnRelation, {
    'structureObj.codeRegion': String(user?.region),
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
