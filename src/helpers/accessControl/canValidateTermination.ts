import { IMisesEnRelation, IUser } from '../../ts/interfaces/db.interfaces';

function canValidateTermination(
  user: IUser,
  miseEnRelation: IMisesEnRelation,
): boolean {
  return (
    (user.roles.includes('structure') &&
      miseEnRelation &&
      miseEnRelation.motifRupture === 'CDIsation') ||
    user.roles.includes('admin')
  );
}

export default canValidateTermination;
