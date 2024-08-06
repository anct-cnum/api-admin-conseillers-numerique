import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureConseiller } from '../../../schemas/conseillers.schemas';
import service from '../../../helpers/services';

type CandidatureConseiller = {};

const creerCandidatureConseiller =
  (app: Application) =>
  async (request: Request, res: Response, next: NextFunction) => {
    try {
      await validerParametres(request);
      const candidatureConseiller = construireRequete(request);
      await stockerCandidatureConseiller(candidatureConseiller, app);
      return next();
    } catch (error) {
      return res.status(400).json({ message: error.message }).end();
    }
  };

const validerParametres = async (request: Request): Promise<void> => {
  await validCandidatureConseiller.validateAsync(request.body);
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
