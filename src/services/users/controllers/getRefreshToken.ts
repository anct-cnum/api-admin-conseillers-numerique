import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import verifyToken from '../../../helpers/auth/verify';

const getRefreshToken =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json('Accès refusé');
    let user: IUser;
    try {
      user = await app
        .service('users')
        .Model.findOne({ refreshToken })
        .select({ password: 0, refreshToken: 0 });
    } catch (error) {
      return res.status(409);
    }
    if (!user) return res.status(403).json('Accès refusé');
    try {
      verifyToken(app)(
        res,
        refreshToken,
        app.get('inclusion_connect').refresh_token_secret,
        user,
      );
    } catch (error) {
      return res.status(500).json(error.message);
    }
    return true;
  };

export default getRefreshToken;
