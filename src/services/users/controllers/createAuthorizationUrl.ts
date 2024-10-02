import { Response } from 'express';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import {
  createProConnectClient,
  generateAuthorizationUrl,
} from '../authentication.repository';
import { Application } from '../../../declarations';

const createAuthorizationUrl =
  (app: Application) => async (req: IRequest, res: Response) => {
    try {
      const proConnectClient = await createProConnectClient(app);
      const { verificationToken, nonce, state } = req.body;
      const { authorizationUrl } = generateAuthorizationUrl(
        proConnectClient,
        verificationToken,
        nonce,
        state,
      );
      res.json({ authorizationUrl });
    } catch (error) {
      res.status(500).json({ message: error.message });
      throw new Error(error);
    }
  };

export default createAuthorizationUrl;
