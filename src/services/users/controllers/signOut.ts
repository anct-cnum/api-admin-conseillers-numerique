import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const signOut = (app: Application) => async (_req: IRequest, res: Response) => {
  res.clearCookie(app.get('inclusion_connect').refreshTokenKey);
  res.end();
};

export default signOut;
