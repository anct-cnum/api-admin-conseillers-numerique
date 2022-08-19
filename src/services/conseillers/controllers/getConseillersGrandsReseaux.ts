import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getConseillersGrandsReseaux =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			const structuresIds: string[] = await app
				.service(service.structures)
				.Model.accessibleBy(req.ability, action.read)
				.find()
				.distinct('_id');

			const conseillers: IConseillers | IConseillers[] = await app
				.service(service.conseillers)
				.Model.find({ structureId: { $in: structuresIds } });
			res.status(200).json(conseillers);
		} catch (error) {
			if (error.name === 'ForbiddenError') {
				res.status(403).json('Accès refusé');
				return;
			}

			res.status(500).json(error.message);
		}
	};

export default getConseillersGrandsReseaux;
