const GrandsReseaux = require('../../datas/imports/grands-reseaux.json');

type Roles =
  | 'admin'
  | 'anonyme'
  | 'structure'
  | 'conseiller'
  | 'prefet'
  | 'grandReseau'
  | 'hub_coop'
  | 'coordinateur';

const mapReseau = GrandsReseaux.map((reseau: any) => reseau.valeur);
type Reseau = (typeof mapReseau)[number];

export { Roles, Reseau };
