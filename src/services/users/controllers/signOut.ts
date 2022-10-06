import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const signOut = (app: Application) => async (_req: IRequest, res: Response) => {
  res.clearCookie(app.get('inclusionConnect').refreshTokenKey);
  return res.json({ message: 'Deconnecté' });
};

export default signOut;
