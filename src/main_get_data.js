
import fs from "fs";
import CrawlerMenu from "./Crawler/CrawlerMenu.js";
import CrawlerProduct from "./Crawler/CrawlerProduct.js";
import ScrapProduct from "./Crawler/ScrapProduct.js";

const save_file	= '../file_storage/data.json';
const url		= 'https://www.arbell.com.ar'; // URL we're scraping

const linksAllProducts	= async (only_one=false) => {//new Promise((rs,rj)=>{
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
			// (async()=>{
				/** @returns Array[{link:string, descript:string}] */
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
					// rs(store_productos);
					return store_productos;
				}
			// })();
			if(only_one	== true){
				break_loop	= true;
			}
		}
	}
}
// );

main (async ()=>{
	let productos = await linksAllProducts();


	// exit(); // Hasta aca, consegui todos los links de todos los productos


	var productos_completos	= [];
	var prod_local_id		= 0;
	for(let producto of productos){
		let _prod	= await ScrapProduct(url, producto, prod_local_id);
		productos_completos.push(_prod);
		prod_local_id++;
	}

	// let _prod	= await ScrapProduct(url, productos[0]);
	// productos_completos.push(_prod);
	// console.log(productos_completos);


	try {
		fs.writeFileSync(save_file, JSON.stringify(productos_completos), 'utf-8');
	} catch (err) {
		console.error(err)
	}
})();