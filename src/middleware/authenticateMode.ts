import jwt from 'jsonwebtoken';
import { DBRef, ObjectId } from 'mongodb';
import { Application, authenticate } from '@feathersjs/express';
import { Response, NextFunction } from 'express';
import { IRequest } from '../ts/interfaces/global.interfaces';
import { IUser } from '../ts/interfaces/db.interfaces';

const authenticateMode =
  (app: Application) =>
  async (req: IRequest, res: Response, next: NextFunction) => {
    try {
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
      ) {
        authenticate('jwt')(req, res, () => {
          const { user } = req;
          req.user = user;
          next();
        });
      } else {
        const accessToken = req.headers?.authorization?.split(' ')[1];
        if (!accessToken) res.status(401).json('Accès refusé');

        jwt.verify(
          accessToken,
          app.get('inclusion_connect').access_token_secret,
          (err, userDecoded: IUser) => {
            if (err) res.status(403).json('Jeton invalide');
            const connect = app.get('mongodb');
            const database = connect.substr(connect.lastIndexOf('/') + 1);
            if (userDecoded.entity) {
              req.user = {
                ...userDecoded,
                entity: new DBRef(
                  'users',
                  new ObjectId(userDecoded.entity.$id as string),
                  database,
                ),
              };
            } else {
              req.user = userDecoded;
            }
            next();
          },
        );
      }
    } catch (error) {
      res.statusMessage = 'Accès refusé';
      res.status(403).end();
    }
  };

export default authenticateMode;
