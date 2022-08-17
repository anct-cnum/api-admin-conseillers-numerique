import { action, ressource, functionnality } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function hubRules(user: IUser, can) {
	// Restreindre les permissions : les prefets ne peuvent voir que les structures de leur departement ou région
	can([action.read], ressource.users, {
		name: user?.name,
	});
	can(action.read, functionnality.exportHub);
}
