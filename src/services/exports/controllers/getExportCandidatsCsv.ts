import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { NotFound } from '@feathersjs/errors';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IMisesEnRelation } from '../../../ts/interfaces/db.interfaces';
import { action } from '../../../helpers/accessControl/accessList';
import service from '../../../helpers/services';
import Structures from '../../structures/structures.class';
import {
	generateCsvCandidat,
	generateCsvCandidatByStructure,
} from '../exports.repository';

const getExportCandidatsCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelations: IMisesEnRelation[];
		try {
			miseEnRelations = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({
					$or: [
						{ statut: { $eq: 'recrutee' } },
						{ statut: { $eq: 'finalisee' } },
						{ statut: { $eq: 'nouvelle_rupture' } },
					],
				})
				.sort({ 'miseEnrelation.structure.oid': 1 });
		} catch (error) {
			res.status(401).json(error.message);
		}

		generateCsvCandidat(miseEnRelations, res, app);
	};

const getExportCandidatsValideStructure =
	(app: Application) => async (req: IRequest, res: Response) => {
		let miseEnRelations: IMisesEnRelation[];
		try {
			miseEnRelations = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({ statut: { $eq: 'recrutee' } })
				.sort({ 'miseEnrelation.structure.oid': 1 });
		} catch (error) {
			res.status(401).json(error.message);
		}

		generateCsvCandidat(miseEnRelations, res, app);
	};

const getExportCandidatsByStructure =
	(app: Application) => async (req: IRequest, res: Response) => {
		const { user } = req;
		let miseEnRelation: IMisesEnRelation[];

		try {
			const structure: Structures = await app
				.service(service.structures)
				.Model.accessibleBy(req.ability, action.read)
				.findOne({ _id: new ObjectId(user.entity.oid) });
			if (structure === null) {
				res.status(404).send(
					new NotFound('Structure not found', {
						id: user.entity.oid,
					}).toJSON(),
				);
				return;
			}
			miseEnRelation = await app
				.service(service.misesEnRelation)
				.Model.accessibleBy(req.ability, action.read)
				.find({
					'structure.$id': new ObjectId(user.entity.oid),
					statut: { $ne: 'finalisee_non_disponible' },
				})
				.collation({ locale: 'fr' })
				.sort({ 'conseillerObj.nom': 1, 'conseillerObj.prenom': 1 });
		} catch (error) {
			res.status(401).json(error.message);
			app.get('sentry').captureException(error);
		}
		generateCsvCandidatByStructure(miseEnRelation, res, app);
	};

export {
	getExportCandidatsCsv,
	getExportCandidatsValideStructure,
	getExportCandidatsByStructure,
};
