export interface IHub {
  name: string;
  region_names?: Array<string>;
  departements?: Array<string>;
}

export interface IDepartement {
  num_dep: string;
  dep_name: string;
  region_name: string;
}

export interface ITypeDossierDS {
  type: string;
  numero_demarche_reconventionnement: string;
  numero_demarche_conventionnement: string;
  categorie: [string];
}
