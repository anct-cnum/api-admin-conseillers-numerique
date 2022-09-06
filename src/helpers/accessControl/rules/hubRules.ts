import { action, functionnality, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function hubRules(user: IUser, can) {
  can(action.read, functionnality.exportHub);
  can([action.read, action.update], ressource.users, {
    _id: user?._id,
  });
}
