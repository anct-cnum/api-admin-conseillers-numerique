import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureStructureCoordinateur } from '../../../schemas/structures.schemas';
import service from '../../../helpers/services';
import verifyCaptcha from '../../../utils/verifyCaptcha';

type CandidatureStructureCoordinateurInput = {
  type: string;
  nom: string;
  siret: string;
  ridet: string;
  contact: {
    prenom: string;
    nom: string;
    fonction: string;
    email: string;
    telephone: string;
  };
  nomCommune: string;
  codePostal: string;
  codeCommune: string;
  codeDepartement: string;
  codeRegion: string;
  codeCom: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  dateDebutMission: Date;
  aIdentifieCoordinateur: boolean;
  missionCoordinateur: string;
  motivation: string;
  confirmationEngagement: boolean;
};

type Structure = CandidatureStructureCoordinateurInput & {
  idPG: number;
  createdAt: Date;
  updatedAt: Date;
  userCreated: boolean;
  statut: string;
  estLabelliseFranceServices: string;
  estZRR: boolean;
  prefet: Array<string>;
  coselec: Array<string>;
  coordinateurCandidature: boolean;
  coordinateurTypeContrat: string;
  nombreConseillersSouhaites: number;
  aIdentifieCandidat: boolean;
};
const getDernierIdPG = async (app: Application): Promise<number> => {
  const derniereStructure = await app
    .service(service.structures)
    .Model.findOne({}, { idPG: -1 });
  return derniereStructure?.idPG || 0;
};

const construireStructureCoordinateur = async (
  app: Application,
  body: CandidatureStructureCoordinateurInput,
): Promise<Structure> => {
  const newDate = new Date();
  return {
    ...body,
    idPG: (await getDernierIdPG(app)) + 1,
    createdAt: newDate,
    updatedAt: newDate,
    userCreated: false,
    statut: 'CREEE',
    estLabelliseFranceServices: 'NON',
    estZRR: null,
    prefet: [],
    coselec: [],
    coordinateurCandidature: false,
    coordinateurTypeContrat: null,
    nombreConseillersSouhaites: 1,
    aIdentifieCandidat: false,
  };
};

const stockerCandidatureStructureCoordinateur = async (
  candidatureStructure: Structure,
  app: Application,
): Promise<void> => {
  const siretOuRidetExists =
    (await app.service(service.structures).Model.countDocuments({
      $or: [
        {
          siret: candidatureStructure.siret,
        },
        {
          ridet: candidatureStructure.ridet,
        },
      ],
    })) !== 0;
  if (siretOuRidetExists) {
    throw new Error('Vous êtes déjà inscrite');
  }
  const result = await app
    .service(service.structures)
    .create(candidatureStructure);
  return result;
};

export const validerCandidatureStructureCoordinateur =
  (app) => async (request: Request, response: Response, next: NextFunction) => {
    try {
      await validCandidatureStructureCoordinateur.validateAsync(request.body);
      await verifyCaptcha(app, request.body['h-captcha-response']);
      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

const creerCandidatureStructureCoordinateur =
  (app: Application) => async (request: Request, response: Response) => {
    const candidatureStructureCoordinateur =
      await construireStructureCoordinateur(app, request.body);
    try {
      const result = await stockerCandidatureStructureCoordinateur(
        candidatureStructureCoordinateur,
        app,
      );
      return response.status(200).json(result).end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default creerCandidatureStructureCoordinateur;
