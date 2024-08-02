import { Application } from '@feathersjs/express';
import { Response, NextFunction, Request } from 'express';
import { validCandidatureConseiller } from '../../../schemas/conseillers.schemas';

const creerCandidatureConseiller =
  (app: Application) =>
  async (req: Request, res: Response, next: NextFunction) => {
    // 1 validation des paramètres
    // 2 rajouter des données (ex : statut créé)
    // 3 écrire sur Mongo
    try {
      console.log('REQ BODY', req.body);
      await validCandidatureConseiller.validateAsync(req.body);
      console.log('2');
      // res.status(200).json({ text: 'Hello world' });
      return next();
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({ message: error.message }).end();
    }
  };

export default creerCandidatureConseiller;
