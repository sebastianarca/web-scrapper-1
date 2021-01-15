import fs from "fs";
import { join } from "path";
import GetData from './main_get_data.js'
import ProcessData from './main_process_data.js'

const store_path	= process.argv[3] || process.argv[2] || null;
switch (false) {
	case store_path:
		throw new Error('Debe pasar como argumento la ruta donde se hubican las imagenes de los productos.');
		break;
	case fs.existsSync(store_path):
		throw new Error(`El directorio ${store_path} no existe.`);
		break;
	case fs.existsSync(join(store_path, '/images')):
		throw new Error(`El directorio de ${join(store_path, '/images')} no existe o no esta disponible`);
		break;
}

(async() =>{
	// Si el archivo ya existe, evitar hacer el request de nuevo.
	if(!fs.existsSync(join(store_path, '/data.json'))){
		await GetData(true);
	}
    await ProcessData();
})();