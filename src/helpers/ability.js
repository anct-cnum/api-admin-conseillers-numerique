const { AbilityBuilder, Ability } = require('@casl/ability');

function defineAbilitiesFor(user) {
  const { can, cannot, build } = new AbilityBuilder(Ability);
  if (user && user.roles.includes('superAdmin')) {
    can('manage', 'all');
  } else if (user?.roles.includes('structure')) {
    can(['read', 'update'], 'users', {
      'entity.$id': user?.entity.oid,
    });
    can('send', 'email');
  }

  cannot('delete', 'Post', { published: true });

  return build();
}

const ANONYMOUS_ABILITY = defineAbilitiesFor(null);

module.exports = function createAbilities(req, res, next) {
  req.ability = req.user.name
    ? defineAbilitiesFor(req.user)
    : ANONYMOUS_ABILITY;
  next();
};
