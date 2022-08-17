import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvStructure } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';

const getExportStructuresCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let structures: IStructures[];
		try {
			structures = await app
				.service(service.structures)
				.Model.accessibleBy(req.ability, action.read)
				.find();
		} catch (error) {
			if (error.name === 'ForbiddenError') {
				res.status(401).json('Accès refusé');
				return;
			}
			res.status(500).json(error.message);
			return;
		}
		generateCsvStructure(structures, res, app);
	};

export default getExportStructuresCsv;
