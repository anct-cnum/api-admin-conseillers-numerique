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
    console.log('<<>############>>>');
    const candidatureConseiller = await construireRequete(app, request);
    // await stockerCandidatureConseiller(candidatureConseiller, app);
    return response.status(200).json({}).end();
  };

const getDernierIdPG = async (app: Application): Promise<number> => {
  const dernierConseiller = await app
    .service(service.conseillers)
    .Model.findOne({}, { idPG: -1 });
  console.log('<<>>>>>>>>>>>>>>', dernierConseiller);
  return dernierConseiller?.idPG;
};

const construireRequete = async (
  app: Application,
  request: Request,
): Promise<CandidatureConseiller> => {
  const requeteEnrichie = {
    ...request.body,
    idPG: (await getDernierIdPG(app)) + 1,
    importedAt: new Date(),
    userCreated: false,
  };
  return requeteEnrichie;
};

// const stockerCandidatureConseiller = async (
//   candidatureConseiller: CandidatureConseiller,
//   app: Application,
// ): Promise<void> => {
//   return app.service(service.conseillers).Model.countDocuments();
// };

export default creerCandidatureConseiller;
