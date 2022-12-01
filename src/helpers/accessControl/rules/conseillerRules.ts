import { Application } from '@feathersjs/express';
import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function conseillerRules(
  app: Application,
  user: IUser,
  can: any,
) {
  // Restreindre les permissions : les conseillers (non coordinateur) ne peuvent voir que les informations de la structure associée
  can([action.read, action.update], ressource.structures, {
    _id: user?.entity.oid,
  });
}
