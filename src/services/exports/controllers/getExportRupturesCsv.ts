import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import service from '../../../helpers/services';
import { generateCsvRupture } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';

const getExportRupture =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelations: IMisesEnRelation[];
		try {
			miseEnRelations = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({ statut: { $eq: 'nouvelle_rupture' } });
		} catch (error) {
			res.status(401).json(error.message);
		}
		generateCsvRupture(miseEnRelations, res, app);
	};

export default getExportRupture;
