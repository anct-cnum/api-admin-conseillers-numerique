import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function structureRules(user: IUser, can) {
	// Restreindre les permissions : les structures ne peuvent voir que les informations les concernant
	can([action.read], ressource.structures, {
		_id: user?.entity.oid,
	});
	can([action.read], ressource.misesEnRelation, {
		'structure.$id': user?.entity.oid,
	});
	can(action.send, functionnality.email);
}
