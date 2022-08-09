import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function prefetRules(user: IUser, can) {
	// Restreindre les permissions : les prefets ne peuvent voir que les structures de leur departement
	can([action.read], ressource.structures, {
		codeDepartement: user?.departement,
	});
}
