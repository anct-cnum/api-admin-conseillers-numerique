/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import dayjs from 'dayjs';
import { Response } from 'express';
import { Application } from '@feathersjs/express';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';
import {
	IMiseEnRelation,
	IConseillers,
	IStructures,
} from '../../ts/interfaces/db.interfaces';

const generateCsv = async (
	miseEnRelations: IMiseEnRelation[],
	res: Response,
	app: Application,
) => {
	res.write(
		'Date candidature;Date prévisionnelle de recrutement;prenom;nom;expérience;téléphone;email;Code Postal;Nom commune;Département;diplômé;palier pix;SIRET structure;ID Structure;Dénomination;Type;Code postal;Code commune;Code département;Code région;Prénom contact SA;Nom contact SA;Téléphone contact SA;Email contact SA;ID conseiller;Nom du comité de sélection;Nombre de conseillers attribués en comité de sélection\n',
	);
	try {
		for (const miseEnrelation of miseEnRelations) {
			const conseiller: IConseillers = await app
				.service(service.conseillers)
				.Model.findOne({ _id: miseEnrelation.conseiller.oid });

			const structure: IStructures = await app
				.service(service.structures)
				.Model.findOne({ _id: miseEnrelation.structure.oid });

			const coselec = getCoselec(structure);

			res.write(
				`${dayjs(conseiller?.createdAt).format('DD/MM/YYYY')};${
					miseEnrelation.dateRecrutement === null
						? 'non renseignée'
						: dayjs(miseEnrelation.dateRecrutement).format('DD/MM/YYYY')
				};${conseiller?.prenom};${conseiller?.nom};${
					conseiller?.aUneExperienceMedNum ? 'oui' : 'non'
				};${conseiller?.telephone};${conseiller?.email};${
					conseiller?.codePostal
				};${conseiller?.nomCommune};${conseiller?.codeDepartement};${
					conseiller?.estDiplomeMedNum ? 'oui' : 'non'
				};${conseiller?.pix ? conseiller?.pix.palier : ''};${
					structure?.siret
				};${structure?.idPG};${structure?.nom};${structure?.type};${
					structure?.codePostal
				};${structure?.codeCommune};${structure?.codeDepartement};${
					structure?.codeRegion
				};${structure?.contact?.prenom};${structure?.contact?.nom};${
					structure?.contact?.telephone
				};${structure?.contact?.email};${conseiller?.idPG};${
					coselec !== null ? coselec?.numero : ''
				};${coselec !== null ? coselec?.nombreConseillersCoselec : 0};\n`,
			);
		}
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};

export default generateCsv;
