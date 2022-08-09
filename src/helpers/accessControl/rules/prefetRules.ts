import { action, ressource } from '../accessList';
import { IUser } from '../../../ts/interfaces/db.interfaces';

export default function prefetRules(user: IUser, can) {
	// Restreindre les permissions : les prefets ne peuvent voir que les structures de leur departement ou région
	can([action.read], ressource.structures, {
		codeDepartement: user?.departement,
	});
	can([action.read], ressource.structures, {
		codeRegion: user?.region,
	});
	// Restreindre les permissions : les prefets ne peuvent voir que les conseillers de leur departement ou région
	can([action.read], ressource.conseillers, {
		codeDepartement: user?.departement,
	});
	can([action.read], ressource.conseillers, {
		codeRegion: user?.region,
	});
}
