import { IMisesEnRelation, IUser } from '../../ts/interfaces/db.interfaces';

const { AbilityBuilder, Ability } = require('@casl/ability');

function canValidateTermination(user: IUser, miseEnRelation: IMisesEnRelation) {
  const { can, cannot, build } = new AbilityBuilder(Ability);
  if (
    (user.roles.includes('structure') &&
      miseEnRelation &&
      miseEnRelation.motifRupture === 'CDISation') ||
    user.roles.includes('admin')
  ) {
    can('validate', 'termination');
  } else {
    cannot('validate', 'termination');
  }

  return build();
}

export default canValidateTermination;
