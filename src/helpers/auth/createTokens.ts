import { sign } from 'jsonwebtoken';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { Application } from '../../declarations';

const createRefreshToken = (app: Application) => async (user: IUser) => {
  return sign(user.toJSON(), app.get('inclusionConnect').refresh_token_secret, {
    expiresIn: app.get('inclusion_connect').refresh_token_duration,
  });
};

const createAccessToken = (app: Application) => async (user: IUser) => {
  return sign(user.toJSON(), app.get('inclusion_connect').access_token_secret, {
    expiresIn: app.get('inclusionConnect').access_token_duration,
  });
};

export { createAccessToken, createRefreshToken };
