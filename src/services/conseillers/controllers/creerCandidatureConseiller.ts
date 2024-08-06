import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureConseiller } from '../../../schemas/conseillers.schemas';
import service from '../../../helpers/services';

type CandidatureConseiller = {};

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
    const candidatureConseiller = construireRequete(request);
    await stockerCandidatureConseiller(candidatureConseiller, app);
    return response.status(200).json({}).end();
  };

const construireRequete = (request: Request): CandidatureConseiller => {
  return request.body;
};

const stockerCandidatureConseiller = async (
  candidatureConseiller: CandidatureConseiller,
  app: Application,
): Promise<void> => {
  return app.service(service.conseillers).Model.countDocuments();
};

export default creerCandidatureConseiller;
