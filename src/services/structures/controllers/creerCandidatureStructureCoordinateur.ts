import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureStructureCoordinateur } from '../../../schemas/structures.schemas';
import service from '../../../helpers/services';
import verifyCaptcha from '../../../utils/captcha';
import mailer from '../../../mailer';

const { v4: uuidv4 } = require('uuid');
const path = require('path');

export type CandidatureStructureCoordinateurInput = {
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
  coordinateurTypeContrat: string;
  motivation: string;
  confirmationEngagement: boolean;
  'cf-turnstile-response': string;
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
  nombreConseillersSouhaites: number;
  coordinateurCandidature: boolean;
  aIdentifieCandidat: boolean;
  emailConfirmedAt: Date;
  emailConfirmationKey: string;
};
const getDernierIdPG = async (app: Application): Promise<number> => {
  const derniereStructure = await app
    .service(service.structures)
    .Model.aggregate([{ $sort: { idPG: -1 } }]);
  return derniereStructure[0]?.idPG || 0;
};

export const construireStructureCoordinateur = async (
  app: Application,
  body: CandidatureStructureCoordinateurInput,
): Promise<Structure> => {
  const newDate = new Date();
  const structureCoordinateur = {
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
    nombreConseillersSouhaites: 1,
    coordinateurCandidature: true,
    aIdentifieCandidat: false,
    emailConfirmedAt: null,
    emailConfirmationKey: uuidv4(),
  };
  delete structureCoordinateur['cf-turnstile-response'];
  return structureCoordinateur;
};

const stockerCandidatureStructureCoordinateur = async (
  candidatureStructure: Structure,
  app: Application,
): Promise<Structure> => {
  const result = await app
    .service(service.structures)
    .create(candidatureStructure);
  return result;
};

export const validerCandidatureStructureCoordinateur =
  (app) => async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await validCandidatureStructureCoordinateur.validateAsync(
        request.body,
      );
      request.body = result;
      await verifyCaptcha(app, request.body['cf-turnstile-response']);
      return next();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };
const envoyerConfirmationParMail = async (
  app: Application,
  email: string,
  prenom: string,
  nom: string,
  token: string,
  idPG: number,
): Promise<any> => {
  const body = await mailer(app).render(
    path.join(__dirname, '../../../emails/confirmation-email-candidature'),
    'confirmation-email-inscription-structure-coordinateur',
    {
      link: mailer(app).utils.getPublicUrl(
        `/candidature-confirmer-structure/${token}`,
      ),
      linkDemarcheSimplifiees: mailer(app).utils.getDemarcheSimplifierUrl(
        `${idPG}`,
      ),
      emailContact: 'conseiller-numerique@anct.gouv.fr',
      prenom,
      nom,
    },
  );
  return mailer(app).createMailer().sendEmail(email, {
    subject: 'Candidature pour un poste de coordinateur',
    body,
  });
};

const creerCandidatureStructureCoordinateur =
  (app: Application) => async (request: Request, response: Response) => {
    const candidatureStructureCoordinateur =
      await construireStructureCoordinateur(app, request.body);
    try {
      const { idPG, contact, emailConfirmationKey } =
        candidatureStructureCoordinateur;
      const { email, prenom, nom } = contact;
      const result = await stockerCandidatureStructureCoordinateur(
        candidatureStructureCoordinateur,
        app,
      );
      await envoyerConfirmationParMail(
        app,
        email,
        prenom,
        nom,
        emailConfirmationKey,
        idPG,
      );
      delete result.emailConfirmationKey;
      return response.status(200).json(result).end();
    } catch (error) {
      return response.status(400).json({ message: error.message }).end();
    }
  };

export default creerCandidatureStructureCoordinateur;
