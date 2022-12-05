type Roles =
  | 'admin'
  | 'anonyme'
  | 'structure'
  | 'conseiller'
  | 'prefet'
  | 'grandReseau'
  | 'hub_coop'
  | 'coordinateur_coop';

type Reseau =
  | 'Croix-Rouge'
  | 'Groupe SOS'
  | 'Emmaüs Connect'
  | 'La Poste'
  | 'UNAF'
  | 'La Ligue de l’enseignement'
  | 'Familles rurales'
  | 'FACE'
  | 'PIMMS'
  | 'APF Handicap'
  | 'UNIJ'
  | 'Conférération MJC'
  | 'Régie de quartier'
  | 'Chambres d’agriculture';

export { Roles, Reseau };
