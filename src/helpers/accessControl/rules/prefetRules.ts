import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../services';
import { getConseillersById } from '../../commonQueriesFunctions';

const getConseillersIds = async (
  app: Application,
  user: IUser,
  structures: ObjectId[],
) => {
  try {
    const conseillersIds: ObjectId[] =
      await getConseillersById(app)(structures);

    return conseillersIds;
  } catch (error) {
    throw new Error(error);
  }
};

export default async function prefetRules(
  app: Application,
  user: IUser,
  can: any,
): Promise<any> {
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
  const conseillersIds = await getConseillersIds(app, user, structures);
  // Restreindre les permissions : les prefets ne peuvent voir que les structures de leur departement ou région
  can([action.read, action.update], ressource.structures, {
    codeDepartement: String(user?.departement),
  });
  can([action.read, action.update], ressource.structures, {
    codeRegion: String(user?.region),
  });
  // Restreindre les permissions : les prefets ne peuvent voir que les conseillers de leur departement ou région
  can([action.read], ressource.conseillers, {
    _id: {
      $in: conseillersIds,
    },
  });
  // Restreindre les permissions : les prefets ne peuvent voir que les misesEnRelation de leur departement ou région
  can([action.read, action.update], ressource.misesEnRelation, {
    'structureObj.codeDepartement': String(user?.departement),
  });
  can([action.read, action.update], ressource.misesEnRelation, {
    'structureObj.codeRegion': String(user?.region),
  });
  can([action.read], ressource.statsTerritoires);
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.cras, {
    'structure.$id': {
      $in: structures,
    },
  });
  can([action.read], ressource.statsConseillersCras, {
    'conseiller.$id': {
      $in: conseillersIds,
    },
  });
  can([action.read], ressource.conseillersRuptures, {
    structureId: structures,
  });
}
