import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMiseEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import generateCsv from '../exports.repository';

const getExportJeRecruteCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelations: IMiseEnRelation[];
		try {
			miseEnRelations = await app
				.service(service.miseEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({
					$or: [
						{ statut: { $eq: 'recrutee' } },
						{ statut: { $eq: 'finalisee' } },
					],
				})
				.sort({ 'miseEnrelation.structure.oid': 1 });
		} catch (error) {
			res.status(401).json(error.message);
			return;
		}

		generateCsv(miseEnRelations, res, app);
	};

export default getExportJeRecruteCsv;
