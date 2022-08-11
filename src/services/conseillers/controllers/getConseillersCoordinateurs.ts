import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';

const getConseillersCoordinateur =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			const conseiller: IConseillers = await app
				.service(service.conseillers)
				.Model.accessibleBy(req.ability, action.read)
				.findOne();

			const listeSubordonnesIds = conseiller.listeSubordonnes.liste;

			const listeSubordonnes: IConseillers[] = await app
				.service(service.conseillers)
				.Model.find({ _id: { $in: listeSubordonnesIds } });

			res.status(200).json(listeSubordonnes);
		} catch (error) {
			if (error.name === 'ForbiddenError') {
				res.status(403).json('Accès refusé');
				return;
			}

			res.status(500).json(error.message);
		}
	};

export default getConseillersCoordinateur;
