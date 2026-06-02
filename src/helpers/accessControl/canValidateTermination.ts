import { IUser } from '../../ts/interfaces/db.interfaces';

function canValidateTermination(user: IUser): boolean {
  return user.roles.includes('admin');
}

export default canValidateTermination;
