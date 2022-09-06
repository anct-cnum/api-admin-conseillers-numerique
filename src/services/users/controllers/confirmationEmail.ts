import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import service from '../../../helpers/services';

import { IUser } from '../../../ts/interfaces/db.interfaces';
import { IRequest } from '../../../ts/interfaces/global.interfaces';

const confirmationEmail =
  (app: Application) => async (req: IRequest, res: Response) => {
    const { token } = req.params;
    const userInfo: IUser | null = await app
      .service(service.users)
      .Model.findOne({ token });
    if (userInfo === null) {
      res.statusMessage = 'User not found';
      res.status(404).end();
      return;
    }
    if (userInfo.mailAModifier === undefined) {
      res.statusMessage = "le nouveau mail n'est pas renseignée";
      res.status(400).end();
      return;
    }
    try {
      const apresEmailConfirmer = await app
        .service(service.users)
        .Model.findOneAndUpdate(
          { _id: userInfo._id },
          {
            $set: { name: userInfo.mailAModifier, token: uuidv4() },
            $unset: { mailAModifier: userInfo.mailAModifier },
          },
          { returnOriginal: false },
        );
      res.send(apresEmailConfirmer);
    } catch (error) {
      res.status(401).json(error.message);
    }
  };

export default confirmationEmail;
