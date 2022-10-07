import jwt from 'jsonwebtoken';
import { Application } from '@feathersjs/express';
import { Response, NextFunction } from 'express';
import { IRequest } from '../ts/interfaces/global.interfaces';
import { IUser } from '../ts/interfaces/db.interfaces';

const authenticate =
  (app: Application) =>
  async (req: IRequest, res: Response, next: NextFunction) => {
    const accessToken = req.headers.authorization.split(' ')[1];
    if (!accessToken) res.status(401).json('Accès refusé');
    try {
      jwt.verify(
        accessToken,
        app.get('inclusion_connect').access_token_secret,
        (err, decoded: IUser) => {
          if (err) res.status(403).json('Jeton invalide');
          req.user = decoded;
        },
      );
      next();
    } catch (error) {
      res.status(401).json('Accès refusé');
    }
  };

export default authenticate;
