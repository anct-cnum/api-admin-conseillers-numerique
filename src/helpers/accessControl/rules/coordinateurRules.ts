import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function coordinateurRules(user: IUser, can) {
	// Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
	switch (user.entity.collection) {
		case 'conseillers':
			can([action.read], ressource.conseillers, {
				_id: user.entity.oid,
			});
			break;
		default:
			break;
	}
}
