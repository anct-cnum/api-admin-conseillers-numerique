import { ObjectId } from 'mongodb';
import { action, ressource } from '../accessList';
import {
  IUser,
  IConseillers,
  isConseillers,
} from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';

const getConseillers = async (
  userId: string,
): Promise<IConseillers | Error> => {
  let conseiller: IConseillers;

  try {
    conseiller = await app
      .service('conseillers')
      .Model.findOne({ _id: userId });
  } catch (error) {
    throw new Error(error);
  }
  return conseiller;
};

export default async function coordinateurRules(
  user: IUser,
  can,
): Promise<any> {
  // Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
  const conseiller: IConseillers | Error = await getConseillers(
    user.entity.oid,
  );
  if (isConseillers(conseiller)) {
    const listeSubordonnesIds: ObjectId[] = conseiller.listeSubordonnes?.liste;
    can([action.read], ressource.conseillers, {
      _id: { $in: listeSubordonnesIds },
    });
    can([action.read], ressource.conseillers, {
      _id: user?.entity.oid,
    });
  }
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
}
