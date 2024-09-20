import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureConseiller } from '../../../schemas/conseillers.schemas';
import service from '../../../helpers/services';
import mailer from '../../../mailer';

import verifyCaptcha from '../../../utils/verifyCaptcha';

const { v4: uuidv4 } = require('uuid');
const path = require('path');

export type CandidatureConseillerInput = {
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
  codeCom: null | string;
  estDemandeurEmploi: boolean;
  estEnEmploi: boolean;
  estEnFormation: boolean;
  estDiplomeMedNum: boolean;
  nomDiplomeMedNum: string;
  'h-captcha-response': string;
};

type Conseiller = CandidatureConseillerInput & {
  idPG: number;
  createdAt: Date;
  updatedAt: Date;
  userCreated: boolean;
  disponible: boolean;
  emailConfirmedAt: Date;
  emailConfirmationKey: string;
};

export const validerCandidatureConseiller =
  (app: Application) =>
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await validCandidatureConseiller.validateAsync(request.body);
      await verifyCaptcha(app, request.body['h-captcha-response']);
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
      const { email, prenom } = candidatureConseiller;
      await envoyerConfirmationParMail(
        app,
        email,
        prenom,
        candidatureConseiller.emailConfirmationKey,
      );
      delete result.emailConfirmationKey;
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

export const construireConseiller = async (
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
    emailConfirmedAt: null,
    emailConfirmationKey: uuidv4(),
  };
};

export const envoyerConfirmationParMail = async (
  app: Application,
  email: string,
  prenom: string,
  token: string,
): Promise<any> => {
  const body = await mailer(app).render(
    path.join(__dirname, '../../../emails/confirmation-email-candidature'),
    'confirmation-email-inscription-conseiller',
    {
      link: mailer(app).utils.getPublicUrl(
        `/candidature-confirmer-conseiller/${token}`,
      ),
      prenom,
    },
  );
  return mailer(app).createMailer().sendEmail(email, {
    subject: 'Confirmation de votre adresse e-mail',
    body,
  });
};

const stockerCandidatureConseiller = async (
  candidatureConseiller: Conseiller,
  app: Application,
): Promise<Conseiller> => {
  try {
    const emailExists =
      (await app.service(service.conseillers).Model.countDocuments({
        email: candidatureConseiller.email,
      })) !== 0;
    if (emailExists) {
      throw new Error('L’email est déjà utilisé');
    }
    const result = await app
      .service(service.conseillers)
      .create(candidatureConseiller);
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

export default creerCandidatureConseiller;
