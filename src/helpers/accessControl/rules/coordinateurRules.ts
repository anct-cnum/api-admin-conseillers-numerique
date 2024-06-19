import { Application } from '@feathersjs/express';
import { action, ressource } from '../accessList';
import {
  IUser,
  IConseillers,
  isArrayConseillers,
  IStructures,
} from '../../../ts/interfaces/db.interfaces';
import service from '../../services';

const getConseillers = async (
  app: Application,
  userId: string,
): Promise<IConseillers[] | Error> => {
  let conseiller: IConseillers;
  let conseillers: IConseillers[];
  let listStructures: IStructures[];
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
      case 'codeCommune':
        listStructures = await app
          .service(service.structures)
          .Model.find({
            statut: 'VALIDATION_COSELEC',
            codeCommune: { $in: conseiller.listeSubordonnes.liste },
          })
          .distinct('_id');
        query = {
          structureId: { $in: listStructures },
        };
        break;
      default:
        query = {
          _id: { $eq: null },
        };
        break;
    }
    try {
      conseillers = await app.service(service.conseillers).Model.aggregate([
        {
          $match: {
            $and: [
              {
                ...query,
                statut: 'RECRUTE',
              },
              {
                _id: { $ne: userId },
              },
            ],
          },
        },
        {
          $project: {
            structureId: 1,
          },
        },
      ]);
    } catch (error) {
      throw new Error(error);
    }

    return conseillers;
  }
  throw new Error("Vous n'êtes pas un coordinateur");
};

export default async function coordinateurRules(
  app: Application,
  user: IUser,
  can: any,
): Promise<any> {
  // Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
  const conseillers: IConseillers[] | Error = await getConseillers(
    app,
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
    can([action.read], ressource.statsTerritoires);
  }
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
}
