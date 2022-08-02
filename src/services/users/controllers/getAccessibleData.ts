import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

import mailSendingPermission from '../../../helpers/accessControl/verifyPermissions';

const getAccessibleData =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			mailSendingPermission(req.ability);
		} catch (error) {
			res.status(401).json(error.message);
		}

		try {
			const user = await app
				.service('users')
				.Model.accessibleBy(req.ability, 'read');

			res.json(user);
		} catch (error) {
			res.status(401).json(error.message);
		}
	};

export default getAccessibleData;
