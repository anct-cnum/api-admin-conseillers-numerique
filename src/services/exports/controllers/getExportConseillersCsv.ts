import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IConseillers } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { generateCsvStructure } from '../exports.repository';
import { action } from '../../../helpers/accessControl/accessList';

const generateCsvConseillersHub = async (
	conseillers: IConseillers[],
	res: Response,
	app: Application,
) => {
	res.write(
		'Prénom;Nom;Email;Id CNFS;Nom Structure;Id Structure;Date rupture;Motif de rupture\n',
	);
	try {
		for (const conseiller of conseillers) {
			console.log(conseiller);
			// const conseiller: IConseillers = await app
			// 	.service(service.conseillers)
			// 	.Model.findOne({ _id: miseEnrelation.conseiller.oid });

			// res.write(
			// 	`${conseiller.prenom};${conseiller.nom};${conseiller.email};${
			// 		conseiller.idPG
			// 	};${structure.nom};${structure.idPG};${formatDate(
			// 		miseEnrelation.dateRupture,
			// 	)};${miseEnrelation.motifRupture}\n`,
			// );
		}
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};

const getExportConseillersCsv =
	(app: Application) => async (req: IRequest, res: Response) => {
		let conseillers: IConseillers[];
		try {
			conseillers = await app
				.service(service.conseillers)
				.Model.accessibleBy(req.ability, action.read)
				.find();
		} catch (error) {
			res.status(401).json(error.message);
			app.get('sentry').captureException(error);
		}
	};

export default getExportConseillersCsv;
