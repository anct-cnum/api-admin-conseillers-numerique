import { action, ressource } from '../accessList';
import {
  IUser,
  IConseillers,
  isArrayConseillers,
} from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';
import service from '../../services';

const getConseillers = async (
  userId: string,
): Promise<IConseillers[] | Error> => {
  let conseiller: IConseillers;
  let conseillers: IConseillers[];
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
      case 'conseillers':
        query = {
          _id: { $in: conseiller.listeSubordonnes.liste },
        };
        break;
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
    try {
      conseillers = await app
        .service(service.conseillers)
        .Model.find(query, { _id: 1, structureId: 1 });
    } catch (error) {
      throw new Error(error);
    }

    return conseillers;
  }
  throw new Error("Vous n'êtes pas un coordinateur");
};

export default async function coordinateurRules(
  user: IUser,
  can,
): Promise<any> {
  // Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
  const conseillers: IConseillers[] | Error = await getConseillers(
    user.entity.oid,
  );
  if (isArrayConseillers(conseillers)) {
    const conseillersIds = conseillers.map((conseiller) => conseiller._id);
    const structuresIds = conseillers.map(
      (conseiller) => conseiller.structureId,
    );

    can([action.read], ressource.conseillers, {
      _id: { $in: conseillersIds },
    });
    can([action.read], ressource.structures, {
      _id: { $in: structuresIds },
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
