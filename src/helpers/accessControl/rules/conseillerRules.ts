import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function consultantRules(user: IUser, can) {
	// Restreindre les permissions : les conseillers (non coordinateur) ne peuvent voir que les informations de la structure associée
	can([action.read, action.update], ressource.structures, {
		_id: user?.entity.oid,
	});
}
