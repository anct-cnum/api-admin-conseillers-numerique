import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidatByStructure } from '../exports.repository';

const getExportCandidatsByStructureCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelation: IMisesEnRelation[];

		try {
			miseEnRelation = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({ statut: { $ne: 'finalisee_non_disponible' } })
				.collation({ locale: 'fr' })
				.sort({ 'conseillerObj.nom': 1, 'conseillerObj.prenom': 1 });
		} catch (error) {
			if (error.name === 'ForbiddenError') {
				res.status(401).json('Accès refusé');
				return;
			}
			res.status(500).json(error.message);
			return;
		}
		generateCsvCandidatByStructure(miseEnRelation, res, app);
	};

export default getExportCandidatsByStructureCsv;
