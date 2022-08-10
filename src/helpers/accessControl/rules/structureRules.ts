import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function structureRules(user: IUser, can) {
	// Restreindre les permissions : les structures ne peuvent voir que les informations les concernant
	can([action.read, action.update], ressource.structures, {
		_id: user?.entity.oid,
	});
	// Restreindre les permissions : les structures ne peuvent voir que les conseillers appartenant à leur organisation
	can([action.read, action.update], ressource.conseillers, {
		structureId: user?.entity.oid,
	});
}
