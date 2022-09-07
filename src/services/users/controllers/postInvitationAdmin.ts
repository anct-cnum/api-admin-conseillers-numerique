import { Application } from '@feathersjs/express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserAdminAndStructure } from '../../../schemas/users.schemas';
const { v4: uuidv4 } = require('uuid');

const postInvitationAdmin =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			let body = req.body;
			delete body.roleActivated;
			const canCreate = req.ability.can(action.create, ressource.users);
			if (!canCreate) {
				res
					.status(403)
					.json({
						message: `Accès refusé, vous n'êtes pas autorisé à inviter un admin`,
					});
				return;
			}
			const errorJoi = await createUserAdminAndStructure.validate(body);
			if (errorJoi?.error) {
				res.status(400).json(String(errorJoi?.error));
				return;
			}

			await app.service(service.users).create({
				name: body.email.toLowerCase(),
				roles: ['admin', 'admin_coop'],
				password: uuidv4(),
				token: uuidv4(),
				tokenCreatedAt: new Date(),
				mailSentDate: null,
				passwordCreated: false,
				createdAt: new Date(),
			});
			// partie envoie de l'email
			res.status(200).json(`L'admin ${body.email} a bien été invité `);
		} catch (error) {
			if (error?.code === 409) {
				res
					.status(409)
					.json({
						message: `Cette adresse mail est déjà utilisée, veuillez choisir une autre adresse mail`,
					});

				return;
			}
			res.status(401).json(error);
		}
	};

export default postInvitationAdmin;
