import { action, ressource } from '../accessList';
import { IUser, IConseillers } from '../../../ts/interfaces/db.interfaces';
import app from '../../../app';

const getConseillers = async (userId: string): Promise<IConseillers> => {
	let conseiller: IConseillers;

	try {
		conseiller = await app
			.service('conseillers')
			.Model.findOne({ _id: userId });
	} catch (error) {
		throw new Error(error);
	}
	return conseiller;
};

export default async function coordinateurRules(
	user: IUser,
	can,
): Promise<any> {
	// Restreindre les permissions : les coordinateurs ne peuvent voir que les informations correspondant à leur profil conseiller
	let listeSubordonnesIds: string[];
	let conseiller: IConseillers;
	try {
		conseiller = await getConseillers(user.entity.oid);
		listeSubordonnesIds = conseiller.listeSubordonnes.liste;
	} catch (error) {
		throw new Error(error);
	}
	can([action.read], ressource.conseillers, {
		_id: { $in: listeSubordonnesIds },
	});
}
