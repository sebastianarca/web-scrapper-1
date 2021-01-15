
import fs from "fs";
import { join } from "path";
import CrawlerMenu from "./Crawler/CrawlerMenu.js";
import CrawlerProduct from "./Crawler/CrawlerProduct.js";
import ScrapProduct from "./Crawler/ScrapProduct.js";

const store_path	= process.argv[2] || null;
switch (false) {
	case store_path:
		throw new Error('Debe pasar como argumento la ruta donde se hubican las imagenes de los productos.');
		break;
	case fs.existsSync(store_path):
		throw new Error(`El directorio ${store_path} no existe.`);
		break;
}

const save_file	= '../file_storage/data.json';
const url		= 'https://www.arbell.com.ar'; // URL we're scraping

/** @returns Array[{link:String, descripcion:String, categoria: String, termino: String}] */
const linksAllProducts	= async (only_one) => {//new Promise((rs,rj)=>{
	let menus			= await CrawlerMenu(url);
	var store_productos	= [];

	var pending_loops	= 0;
	var resolve_loops	= 0;
	var break_loop		= false;

	for(let menu of menus){
		if(break_loop){
			continue;
		}
		for(let termino of menu.terminos){
			if(break_loop){
				continue;
			}
			pending_loops++;

			try {
				let productos	= await CrawlerProduct(url+termino.url);
				productos.forEach((prod) => {
					store_productos.push({
						link: prod.link,
						descripcion: prod.descript,
						categoria: menu.name,
						termino: termino.name,
					});
				})
			}catch(e){
				console.log(e);
			}

			if(only_one	== true){
				break_loop	= true;
			}
			resolve_loops++;
			if(pending_loops==resolve_loops){
				return store_productos;
			}
			if(only_one	== true){
				break_loop	= true;
			}
		}
	}
}

export default async (only_one)=>{
	console.log('Inicio - Obtener Datos');
	
	let productos = await linksAllProducts(only_one);
	console.log('Todos los productos obtenidos');

	var productos_completos	= [];
	var prod_local_id		= 0;
	for(let producto of productos){
		let _prod	= await ScrapProduct(url, producto, prod_local_id);
		productos_completos.push(_prod);
		prod_local_id++;
	}

	try {
		fs.writeFileSync(join(store_path, 'data.json'), JSON.stringify(productos_completos), 'utf-8');
	} catch (err) {
		console.error(err)
	}
	
	console.log('Fin - Obtener Datos');
}