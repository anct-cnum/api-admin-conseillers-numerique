import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureStructure } from '../../../schemas/structures.schemas';
import service from '../../../helpers/services';

type CandidatureStructureInput = {
  type: string;
  nom: string;
  siret: string;
  ridet: string;
  aIdentifieCandidat: boolean;
  dateDebutMission: Date;
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
  nombreConseillersSouhaites: number;
  motivation: string;
  confirmationEngagement: boolean;
};

type Structure = CandidatureStructureInput & {
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
};

export const validerCandidatureStructure =
  () => async (request: Request, response: Response, next: NextFunction) => {
    try {
      await validCandidatureStructure.validateAsync(request.body);
      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

const construireStructure = async (
  app: Application,
  body: CandidatureStructureInput,
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
  };
};

const stockerCandidatureStructure = async (
  candidatureStructure: Structure,
  app: Application,
): Promise<void> => {
  const siretOuRidetExists =
    (await app.service(service.structures).Model.countDocuments({
      $or: [
        {
          $and: [
            { siret: { $ne: null } },
            { siret: candidatureStructure.siret },
          ],
        },
        {
          $and: [
            { ridet: { $ne: null } },
            { ridet: candidatureStructure.ridet },
          ],
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
const getDernierIdPG = async (app: Application): Promise<number> => {
  const derniereStructure = await app
    .service(service.structures)
    .Model.findOne({}, { idPG: -1 });
  return derniereStructure?.idPG || 0;
};

const creerCandidatureStructure =
  (app: Application) => async (request: Request, response: Response) => {
    const candidatureStructure = await construireStructure(app, request.body);
    try {
      const result = await stockerCandidatureStructure(
        candidatureStructure,
        app,
      );
      return response.status(200).json(result).end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default creerCandidatureStructure;
