import { Application } from '@feathersjs/express';
import { action, ressource } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { createUserPrefet } from '../../../schemas/users.schemas';
const { v4: uuidv4 } = require('uuid');

const postInvitationPrefet =
	(app: Application) => async (req: IRequest, res: Response) => {
		try {
			let body = req.body;
			delete body.roleActivated;
      const { email, ...localite } = body;
			const canCreate = req.ability.can(action.create, ressource.users);
			if (!canCreate) {
				res
					.status(403)
					.json({
						message: `Accès refusé, vous n'êtes pas autorisé à créer un prefet`,
					});
				return;
			}
			const errorJoi = await createUserPrefet.validate(body);
			if (errorJoi?.error) {
				res.status(400).json(String(errorJoi?.error));
				return;
			}
			await app.service(service.users).create({
				name: body.email,
				roles: Array('prefet'),
				password: uuidv4(),
				token: uuidv4(),
				tokenCreatedAt: new Date(),
				mailSentDate: null,
				passwordCreated: false,
				createdAt: new Date(),
        ...localite,
			});
			// partie envoie de l'email
			res.status(200).json(`Le préfet ${body.email} a bien été invité `);
		} catch (error) {
			if (error?.code === 409) {
				res
					.status(409)
					.json({
						message: `Cette adresse mail existe déjà en base, veuillez choisir une autre adresse mail`,
					});

				return;
			}
			res.status(401).json(error);
		}
	};

export default postInvitationPrefet;
