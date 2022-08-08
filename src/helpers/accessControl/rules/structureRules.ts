import { action, ressource, functionnality } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function structureRules(user: IUser, can) {
	can([action.read, action.update], ressource.users, {
		'entity.$id': user?.entity.oid,
	});
	can([action.read], ressource.structures, {
		_id: user?.entity.oid,
	});
	can([action.read], ressource.misesEnRelation, {
		'structure.$id': user?.entity.oid,
	});
	can(action.send, functionnality.email);
}
