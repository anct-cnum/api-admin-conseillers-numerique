/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import dayjs from 'dayjs';
import { Response } from 'express';
import { Application } from '@feathersjs/express';
import { ObjectId } from 'mongodb';
import { getCoselec } from '../../utils';
import service from '../../helpers/services';
import {
	IMisesEnRelation,
	IConseillers,
	IStructures,
	IUser,
} from '../../ts/interfaces/db.interfaces';

const formatDate = (date) =>
	dayjs(new Date(date.getTime() + 120 * 60000)).format('DD/MM/YYYY');

const generateCsvCandidat = async (
	miseEnRelations: IMisesEnRelation[],
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
				`${formatDate(conseiller?.createdAt)};${
					miseEnrelation.dateRecrutement === null
						? 'non renseignée'
						: formatDate(miseEnrelation.dateRecrutement)
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

const conseillerByMisesEnRelation = async (
	idConseiller: ObjectId,
	app: Application,
) => app.service(service.conseillers).Model.findOne({ _id: idConseiller });

const generateCsvCandidatByStructure = async (
	miseEnRelations: IMisesEnRelation[],
	res: Response,
	app: Application,
) => {
	const promises = [];
	res.write('Nom;Prénom;Email;Code postal;Expérience;Test PIX;CV\n');

	try {
		for (const miseEnrelation of miseEnRelations) {
			promises.push(
				new Promise<void>((resolve) => {
					conseillerByMisesEnRelation(miseEnrelation.conseiller.oid, app).then(
						(conseiller) => {
							res.write(
								`${conseiller.nom};${conseiller.prenom};${conseiller.email};${
									conseiller.codePostal
								};${conseiller.aUneExperienceMedNum ? 'oui' : 'non'};${
									conseiller.pix === undefined ? 'non' : 'oui'
								};${conseiller.cv === undefined ? 'non' : 'oui'}\n`,
							);
							resolve();
						},
					);
				}),
			);
		}
		await Promise.all(promises);
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};
const getFormatHistoriqueGroupeCRA = (nbSlice, groupeCRAHistorique) =>
	groupeCRAHistorique.slice(nbSlice);

const generateCsvConseillersWithoutCRA = async (
	conseillers: IConseillers[] | IStructures[],
	res: Response,
) => {
	const csvCellSeparator = ';';
	const csvLineSeparator = '\n';

	try {
		// for (const conseiller of conseillers) {
		const fileHeaders = [
			'Nom',
			'Prénom',
			'Email @conseiller-numerique.fr',
			'Code Postal du conseiller',
			'Code département du conseiller',
			'Numéro de téléphone du conseiller',
			"Date d'envoi du mail M+1",
			"Date d'envoi du mail M+1,5",
			'Id de la structure',
			'Siret de la structure',
			'Nom de la structure',
		];
		res.write(
			[
				fileHeaders.join(csvCellSeparator),
				...conseillers.map((statCnfsWithoutCRA) =>
					[
						statCnfsWithoutCRA.nom,
						statCnfsWithoutCRA.prenom,
						statCnfsWithoutCRA.emailCN.address,
						statCnfsWithoutCRA.codePostal,
						statCnfsWithoutCRA.codeDepartement,
						statCnfsWithoutCRA.telephone,
						formatDate(
							getFormatHistoriqueGroupeCRA(
								-1,
								statCnfsWithoutCRA.groupeCRAHistorique,
							)[0]['dateMailSendConseillerM+1'],
						),
						formatDate(
							getFormatHistoriqueGroupeCRA(
								-1,
								statCnfsWithoutCRA.groupeCRAHistorique,
							)[0]['dateMailSendConseillerM+1,5'],
						),
						statCnfsWithoutCRA.structure.idPG,
						statCnfsWithoutCRA.structure.siret,
						statCnfsWithoutCRA.structure.nom,
					].join(csvCellSeparator),
				),
			].join(csvLineSeparator),
		);
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};

const generateCsvStructure = async (
	structures: IStructures[],
	res: Response,
	app: Application,
) => {
	res.write(
		'SIRET structure;ID Structure;Dénomination;Type;Statut;Code postal;Code commune;Code département;Code région;Téléphone;Email;Compte créé;Mot de passe choisi;Nombre de mises en relation;Nombre de conseillers souhaités;Validée en COSELEC;Nombre de conseillers validés par le COSELEC;Numéro COSELEC;ZRR;QPV;Nombre de quartiers QPV;Labelisée France Services;Raison sociale;Nom commune INSEE;Code commune INSEE;Adresse postale;Libellé catégorie juridique niv III;Grand Réseau;Nom Grand Réseau\n',
	);

	try {
		for (const structure of structures) {
			const matchings: number = await app
				.service(service.misesEnRelation)
				// eslint-disable-next-line no-underscore-dangle
				.Model.countDocuments({ 'structure.$id': new ObjectId(structure._id) });

			const user: IUser = await app
				.service(service.users)
				// eslint-disable-next-line no-underscore-dangle
				.Model.findOne({ 'entity.$id': new ObjectId(structure._id) });

			const coselec = getCoselec(structure);
			let label = 'non renseigné';
			if (
				structure?.estLabelliseFranceServices &&
				structure.estLabelliseFranceServices === 'OUI'
			) {
				label = 'oui';
			} else if (
				structure?.estLabelliseFranceServices &&
				structure.estLabelliseFranceServices === 'NON'
			) {
				label = 'non';
			}
			let adresse = `${
				structure?.insee?.etablissement?.adresse?.numero_voie ?? ''
			} ${structure?.insee?.etablissement?.adresse?.type_voie ?? ''} ${
				structure?.insee?.etablissement?.adresse?.nom_voie ?? ''
			}\n${
				structure?.insee?.etablissement?.adresse?.complement_adresse
					? `${structure.insee.etablissement.adresse.complement_adresse}\n`
					: ''
			}${structure?.insee?.etablissement?.adresse?.code_postal ?? ''} ${
				structure?.insee?.etablissement?.adresse?.localite ?? ''
			}`;

			adresse = adresse.replace(/["']/g, '');
			res.write(
				`${structure.siret};${structure.idPG};${structure.nom};${
					structure.type === 'PRIVATE' ? 'privée' : 'publique'
				};${structure.statut};${structure.codePostal};${
					structure.codeCommune
				};${structure.codeDepartement};${structure.codeRegion};${
					structure?.contact?.telephone
				};${structure?.contact?.email};${
					structure.userCreated ? 'oui' : 'non'
				};${
					user !== null && user.passwordCreated ? 'oui' : 'non'
				};${matchings};${structure.nombreConseillersSouhaites ?? 0};${
					structure.statut === 'VALIDATION_COSELEC' ? 'oui' : 'non'
				};${
					structure.statut === 'VALIDATION_COSELEC'
						? coselec?.nombreConseillersCoselec
						: 0
				};${structure.statut === 'VALIDATION_COSELEC' ? coselec?.numero : ''};${
					structure.estZRR ? 'oui' : 'non'
				};${structure.qpvStatut ?? 'Non défini'};${
					structure?.qpvListe ? structure.qpvListe.length : 0
				};${label};${
					structure?.insee?.entreprise?.raison_sociale
						? structure?.insee?.entreprise?.raison_sociale
						: ''
				};${
					structure?.insee?.etablissement?.commune_implantation?.value
						? structure?.insee?.etablissement?.commune_implantation?.value
						: ''
				};${
					structure?.insee?.etablissement?.commune_implantation?.code
						? structure?.insee?.etablissement?.commune_implantation?.code
						: ''
				};"${adresse}";${structure?.insee?.entreprise?.forme_juridique ?? ''};${
					structure?.reseau ? 'oui' : 'non'
				};${structure?.reseau ?? ''}\n`,
			);
		}
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};

const generateCsvRupture = async (
	miseEnRelations: IMisesEnRelation[],
	res: Response,
	app: Application,
) => {
	res.write(
		'Prénom;Nom;Email;Id CNFS;Nom Structure;Id Structure;Date rupture;Motif de rupture\n',
	);
	try {
		for (const miseEnrelation of miseEnRelations) {
			const conseiller: IConseillers = await app
				.service(service.conseillers)
				.Model.findOne({ _id: miseEnrelation.conseiller.oid });

			const structure: IStructures = await app
				.service(service.structures)
				.Model.findOne({ _id: miseEnrelation.structure.oid });

			res.write(
				`${conseiller.prenom};${conseiller.nom};${conseiller.email};${
					conseiller.idPG
				};${structure.nom};${structure.idPG};${formatDate(
					miseEnrelation.dateRupture,
				)};${miseEnrelation.motifRupture}\n`,
			);
		}
		res.end();
	} catch (error) {
		res.status(400).json(error);
	}
};

export {
	generateCsvCandidat,
	generateCsvCandidatByStructure,
	generateCsvConseillersWithoutCRA,
	generateCsvStructure,
	generateCsvRupture,
};
