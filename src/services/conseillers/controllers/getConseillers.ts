import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getConseillers =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			const conseillers: IConseillers[] | IConseillers = await app
				.service(service.conseillers)
				.Model.accessibleBy(req.ability, action.read)
				.find();

			res.status(200).json(conseillers);
		} catch (error) {
			res.status(400).json(error.message);
		}
	};

export default getConseillers;
