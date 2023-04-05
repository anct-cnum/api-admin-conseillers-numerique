import { Application } from '@feathersjs/express';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { IRequest } from '../../../ts/interfaces/global.interfaces';
import { IUser } from '../../../ts/interfaces/db.interfaces';
import service from '../../../helpers/services';
import { action } from '../../../helpers/accessControl/accessList';

const getUsers = (app: Application) => async (req: IRequest, res: Response) => {
  try {
    const user: IUser[] | IUser = await app
      .service(service.users)
      .Model.accessibleBy(req.ability, action.read)
      .find({ _id: { $ne: new ObjectId(req.user?._id) } })
      .select({ name: 1, passwordCreated: 1, sub: 1 });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
    throw new Error(error);
  }
};

export default getUsers;
