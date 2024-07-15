import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { Application } from '@feathersjs/express';
import { IRequest } from '../ts/interfaces/global.interfaces';

const apiAuthorization =
  (app: Application) =>
  async (req: IRequest, res: Response, next: NextFunction) => {
    try {
      if (
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
      ) {
        next();
      } else {
        const authHeader = req.headers.authorization;

        if (authHeader) {
          const token = authHeader.split(' ')[1];

          jwt.verify(token, app.get('api_authorization_secret'), (err) => {
            if (err) {
              res.sendStatus(403);
            }
            next();
          });
        } else {
          res.sendStatus(401);
        }
      }
    } catch (error) {
      res.statusMessage = 'Accès refusé';
      res.status(403).end();
    }
  };

export default apiAuthorization;
