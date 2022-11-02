import { ObjectId } from 'mongodb';
import { action, ressource } from '../accessList';
import { IUser, IConseillers } from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';
import service from '../../services';

const getConseillers = async (userId: string): Promise<ObjectId[] | Error> => {
  let conseiller: IConseillers;
  let conseillersIds: ObjectId[];
  let query;
  try {
    conseiller = await app
      .service(service.conseillers)
      .Model.findOne({ _id: userId });
  } catch (error) {
    throw new Error(error);
  }
  if (conseiller?.estCoordinateur === true) {
    switch (conseiller.listeSubordonnes?.type) {
      case 'codeDepartement':
        query = {
          codeDepartementStructure: { $in: conseiller.listeSubordonnes.liste },
        };
        break;
      case 'codeRegion':
        query = {
          codeRegionStructure: { $in: conseiller.listeSubordonnes.liste },
        };
        break;
      default:
    }
    if (query) {
      try {
        conseillersIds = await app
          .service(service.conseillers)
          .Model.find(query)
          .distinct('_id');
      } catch (error) {
        throw new Error(error);
      }
      return conseillersIds;
    }
    return conseiller.listeSubordonnes.liste;
  }
  throw new Error("Vous n'êtes pas un coordinateur");
};

export default async function coordinateurRules(
  user: IUser,
  can,
): Promise<any> {
  // Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
  const conseillersIds: ObjectId[] | Error = await getConseillers(
    user.entity.oid,
  );
  if (conseillersIds instanceof Array<ObjectId>) {
    can([action.read], ressource.conseillers, {
      _id: { $in: conseillersIds },
    });
    can([action.read], ressource.conseillers, {
      _id: user?.entity.oid,
    });
    can([action.read], ressource.misesEnRelation, {
      'conseiller.$id': { $in: conseillersIds },
    });
    can([action.read], ressource.cras, {
      'conseiller.$id': { $in: conseillersIds },
    });
    can([action.read], ressource.statsConseillersCras, {
      'conseiller.$id': { $in: conseillersIds },
    });
  }
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
  can([action.read], ressource.statsTerritoires);
}
