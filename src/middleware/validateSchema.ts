import Joi, { ObjectSchema } from 'joi';
import { NextFunction, Request, Response } from 'express';
import { IUser } from '../ts/interfaces/db.interfaces';

export const ValidateJoi = (schema: ObjectSchema) => {
	// eslint-disable-next-line consistent-return
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await schema.validateAsync(req.body);

			next();
		} catch (error) {
			return res.status(422).json({ error });
		}
	};
};

export const Schemas = {
	author: {
		create: Joi.object<IUser>({
			name: Joi.string().required(),
		}),
		update: Joi.object<IUser>({
			name: Joi.string().required(),
		}),
	},
};
