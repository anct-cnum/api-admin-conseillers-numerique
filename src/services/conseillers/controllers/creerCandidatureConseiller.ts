import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureConseiller } from '../../../schemas/conseillers.schemas';
import service from '../../../helpers/services';

type CandidatureConseillerInput = {
  prenom: string;
  nom: string;
  email: string;
  nomCommune: string;
  codePostal: string;
  codeCommune: string;
  codeDepartement: string;
  codeRegion: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  aUneExperienceMedNum: boolean;
  dateDisponibilite: Date;
  distanceMax: number;
  motivation: string;
  telephone: string;
  codeCom: string;
  estDemandeurEmploi: boolean;
  estEnEmploi: boolean;
  estEnFormation: boolean;
  estDiplomeMedNum: boolean;
  nomDiplomeMedNum: string;
};

type Conseiller = CandidatureConseillerInput & {
  idPG: number;
  createdAt: Date;
  updatedAt: Date;
  userCreated: boolean;
  disponible: boolean;
};

export const validerCandidatureConsiller =
  () => async (request: Request, response: Response, next: NextFunction) => {
    try {
      await validCandidatureConseiller.validateAsync(request.body);
      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

const creerCandidatureConseiller =
  (app: Application) => async (request: Request, response: Response) => {
    const candidatureConseiller = await construireConseiller(app, request.body);
    try {
      const result = await stockerCandidatureConseiller(
        candidatureConseiller,
        app,
      );
      return response.status(200).json(result).end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

const getDernierIdPG = async (app: Application): Promise<number> => {
  const dernierConseiller = await app
    .service(service.conseillers)
    .Model.findOne({}, { idPG: -1 });
  return dernierConseiller?.idPG || 0;
};

const construireConseiller = async (
  app: Application,
  body: CandidatureConseillerInput,
): Promise<Conseiller> => {
  const newDate = new Date();
  return {
    ...body,
    idPG: (await getDernierIdPG(app)) + 1,
    createdAt: newDate,
    updatedAt: newDate,
    userCreated: false,
    disponible: true,
  };
};

const stockerCandidatureConseiller = async (
  candidatureConseiller: Conseiller,
  app: Application,
): Promise<void> => {
  const emailExists =
    (await app
      .service(service.conseillers)
      .Model.countDocuments({ email: candidatureConseiller.email })) !== 0;
  if (emailExists) {
    throw new Error('L’email est déjà utilisé');
  }
  const result = await app
    .service(service.conseillers)
    .create(candidatureConseiller);
  return result;
};

export default creerCandidatureConseiller;
