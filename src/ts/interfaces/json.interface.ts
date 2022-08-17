export interface Hub {
	name: string;
	region_names?: Array<string>;
	departements?: Array<string>;
}

export interface Departement {
	num_dep: string;
	dep_name: string;
	region_name: string;
}
