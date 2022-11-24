import jwt from 'jsonwebtoken';
import { DBRef } from 'mongodb';
import { Application } from '@feathersjs/express';
import { Response, NextFunction } from 'express';
import { IRequest } from '../ts/interfaces/global.interfaces';
import { IUser } from '../ts/interfaces/db.interfaces';

const authenticate =
  (app: Application) =>
  async (req: IRequest, res: Response, next: NextFunction) => {
    const accessToken = req.headers?.authorization?.split(' ')[1];
    if (!accessToken) res.status(401).json('Accès refusé');
    try {
      jwt.verify(
        accessToken,
        app.get('inclusion_connect').access_token_secret,
        (err, userDecoded: IUser) => {
          if (err) res.status(403).json('Jeton invalide');
          const connect = app.get('mongodb');
          const database = connect.substr(connect.lastIndexOf('/') + 1);
          req.user = {
            ...userDecoded,
            entity: new DBRef('users', userDecoded.entity.$id, database),
          };
        },
      );
      next();
    } catch (error) {
      res.statusMessage = 'Accès refusé';
      res.status(403).end();
    }
  };

export default authenticate;
