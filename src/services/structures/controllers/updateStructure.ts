import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IStructures } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const updateStructure =
	(app: Application) => async (req: IRequest, res: Response) => {
		const filter = { _id: req.params.id };
		const update = { contact: req.body.contact };
		try {
			const structure: IStructures = await app
				.service(service.structures)
				.Model.accessibleBy(req.ability, action.update)
				.findOneAndUpdate(filter, update);

			res.status(200).json(structure);
		} catch (error) {
			if (error.name === 'ForbiddenError') {
				res.status(403).json('Accès refusé');
				return;
			}
			res.status(500).json(error.message);
		}
	};

export default updateStructure;
