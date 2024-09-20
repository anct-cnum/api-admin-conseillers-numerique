import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureStructure } from '../../../schemas/structures.schemas';
import service from '../../../helpers/services';
import verifyCaptcha from '../../../utils/verifyCaptcha';
import mailer from '../../../mailer';

const { v4: uuidv4 } = require('uuid');
const path = require('path');

export type CandidatureStructureInput = {
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
  'h-captcha-response': string;
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
  emailConfirmedAt: Date;
  emailConfirmationKey: string;
};

export const validerCandidatureStructure =
  (app: Application) =>
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await validCandidatureStructure.validateAsync(request.body);
      await verifyCaptcha(app, request.body['h-captcha-response']);
      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export const construireStructure = async (
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
    emailConfirmedAt: null,
    emailConfirmationKey: uuidv4(),
  };
};

const stockerCandidatureStructure = async (
  candidatureStructure: Structure,
  app: Application,
): Promise<Structure> => {
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
    throw new Error('Vous êtes déjà inscrit : SIRET/RIDET déjà utilisé');
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

const envoyerConfirmationParMail = async (
  app: Application,
  email: string,
  prenom: string,
  nom: string,
  token: string,
): Promise<object> => {
  const body = await mailer(app).render(
    path.join(__dirname, '../../../emails/confirmation-email-candidature'),
    'confirmation-email-inscription-structure',
    {
      link: mailer(app).utils.getPublicUrl(
        `/candidature-confirmer-structure/${token}`,
      ),
      emailContact: 'conseiller-numerique@anct.gouv.fr',
      prenom,
      nom,
    },
  );
  return mailer(app).createMailer().sendEmail(email, {
    subject: 'Confirmation de l’enregistrement de votre candidature',
    body,
  });
};

const creerCandidatureStructure =
  (app: Application) => async (request: Request, response: Response) => {
    const candidatureStructure = await construireStructure(app, request.body);
    try {
      const { contact, emailConfirmationKey } = candidatureStructure;
      const { email, prenom, nom } = contact;
      const result = await stockerCandidatureStructure(
        candidatureStructure,
        app,
      );
      await envoyerConfirmationParMail(
        app,
        email,
        prenom,
        nom,
        emailConfirmationKey,
      );
      delete result.emailConfirmationKey;
      return response.status(200).json(result).end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default creerCandidatureStructure;
