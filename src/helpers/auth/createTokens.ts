import { sign } from 'jsonwebtoken';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { Application } from '../../declarations';

const createRefreshToken = (app: Application) => async (user: IUser) => {
  return sign(user.toJSON(), app.get('inclusionConnect').refreshTokenSecret, {
    expiresIn: app.get('inclusionConnect').refreshTokenDuration,
  });
};

const createAccessToken = (app: Application) => async (user: IUser) => {
  return sign(user.toJSON(), app.get('inclusionConnect').accessTokenSecret, {
    expiresIn: app.get('inclusionConnect').accessTokenDuration,
  });
};

export { createAccessToken, createRefreshToken };
