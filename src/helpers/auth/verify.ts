import { verify, sign } from 'jsonwebtoken';
import { Response } from 'express';
import { IUser } from '../../ts/interfaces/db.interfaces';
import { Application } from '../../declarations';

const verifyToken =
  (app: Application) =>
  async (res: Response, token: string, secret: string, user: IUser) =>
    verify(token, secret, (err, decoded: IUser) => {
      if (err || user.name !== decoded.name)
        return res.status(403).json('token expired');
      const accessToken = sign(
        user.toJSON(),
        app.get('inclusion_connect').access_token_secret,
        {
          expiresIn: app.get('inclusionConnect').accessTokenDuration,
        },
      );
      return res.status(200).json({ user, accessToken });
    });

export default verifyToken;
