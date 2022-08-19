import { action, functionnality } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function hubRules(user: IUser, can) {
	can(action.read, functionnality.exportHub);
}
