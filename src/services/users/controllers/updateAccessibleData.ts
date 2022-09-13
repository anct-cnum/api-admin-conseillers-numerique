const updateAccessibleData = (app) => async (req, res) => {
  try {
    const user = await app
      .service('users')
      .Model.accessibleBy(req.ability, 'update')
      .findOneAndUpdate({ _id: req.params.id }, { name: req.body.name });
    res.status(200).json(user);
  } catch (error) {
    res.status(401).json(error.message);
  }
};

export default updateAccessibleData;
