import { ObjectId } from 'mongodb';
import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';
import service from '../../services';
import { getConseillersById } from '../../commonQueriesFunctions';

const getConseillersIds = async (user) => {
  try {
    let query = {};
    if (user?.region) {
      query = {
        codeRegion: {
          $in: [`${user?.region}`],
        },
      };
    } else {
      query = {
        codeDepartement: {
          $in: [`${user?.departement}`],
        },
      };
    }
    const structures: ObjectId[] = await app
      .service(service.structures)
      .Model.find(query)
      .distinct('_id');
    const conseillersIds: ObjectId[] = await getConseillersById(app)(
      structures,
    );

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
  can([action.read], ressource.statsTerritoires, {
    codeDepartement: user?.departement,
  });
  can([action.read], ressource.statsTerritoires, {
    codeRegion: user?.region,
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
}
