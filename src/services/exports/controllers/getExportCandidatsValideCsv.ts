import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { generateCsvCandidat } from '../exports.repository';

const getExportCandidatsValideStructureCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelations: IMisesEnRelation[];
		try {
			miseEnRelations = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({ statut: { $eq: 'recrutee' } })
				.sort({ 'miseEnrelation.structure.oid': 1 });
		} catch (error) {
			res.status(401).json(error.message);
		}

		generateCsvCandidat(miseEnRelations, res, app);
	};

export default getExportCandidatsValideStructureCsv;
