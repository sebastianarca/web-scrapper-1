
// 'use strict';
import fs from "fs";
import { exit } from "process";
import crypto from "crypto";
// import { promisify } from "util";
import { execSync } from "child_process";
import { join } from "path";
import axios    from "axios";
import { minify } from "html-minifier";
import WpHelper from "./Helper/WpHelper.js";


const store_path	= process.argv[2] || null;

const url			= 'https://www.arbell.com.ar'; // URL we're scraping
var catalog_products= [];

const sleep	= (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
const descargarImagen	= (url_image, store_name) => 
	axios({url:url_image, responseType: 'stream'})
	.then(resp => new Promise((rs, rj) => {
		resp.data
		.pipe(fs.createWriteStream(join( store_path, `images/${store_name}`)))
		.on('finish', ()=>rs(true))
		.on('error', e => rj(e));
	}));

/**
 {
 prod_local_id: int
 link_original: string
 titulo: string
 html_content: string
 codigo: string
 categoria: string
 etiqueta: array [link:string,text:string]
 adicional: string
 img: string
 }
 */

var etiquetas	= [];
var categorias	= [];
var check_img_file = /\.[a-z]{3}$/;
var errores_img	= 0;

const compileData	= async() => {
	for(let key in catalog_products){
		let producto	= catalog_products[key];

		producto.codigo	= producto.codigo.replace(/Codigo\:\ /, '');
		producto.codigo	= producto.codigo.trim();
		producto.id		= producto.codigo;

		// Indexar categorias
		let cat_hash_key	= crypto.createHash('sha256').update(producto.categoria, 'utf8').digest('base64');
		if(!categorias[cat_hash_key]){
			categorias[cat_hash_key]	= {text: producto.categoria, hash_key: cat_hash_key, wp_id: null};
		}
		producto.categoria	= {text: producto.categoria, hash_key: cat_hash_key, wp_id: null};

		// Indexar etiquetas
		for(let key2 in producto.etiqueta){
			let _et	= producto.etiqueta[key2].text.replace(/\,/, '');
			_et	= _et.trim();
			let et_hash_key	= crypto.createHash('sha256').update(_et, 'utf8').digest('base64');
			if(!etiquetas[et_hash_key]){
				etiquetas[et_hash_key]	= {text: _et, hash_key: et_hash_key, wp_id: null};
			}
			producto.etiqueta[key2]	= {text: _et, hash_key: et_hash_key, wp_id: null};
		}

		// Descargar imagenes
		if(check_img_file.test(producto.img)){	
			let extencion	= check_img_file.exec(producto.img)[0];
			if(!fs.existsSync(join( store_path, `images/${producto.codigo}${extencion}`))){
				try{
					await descargarImagen(producto.img, `${producto.codigo}${extencion}`);
					errores_img++;
				}catch(e){
					errores_img++;
				}
			}
		}

		catalog_products[key]	= producto;
	}
}

const generateWpIdForCategoriesAndTags	= async () => {
	for (let key in categorias) {
		let text		= categorias[key].text;
		let hash_key	= key;
		let wp_id		= WpHelper.getCategory(text) || WpHelper.createCategory(text);
		categorias[key]	= {hash_key, text, wp_id};
	}

	for (let key in etiquetas) {
		let text		= etiquetas[key].text;
		let hash_key	= key;
		let wp_id		= WpHelper.getTag(text) || WpHelper.createTag(text);
		etiquetas[key]	= {hash_key, text, wp_id};
	}
}

const createAndLinkPost					= async() =>{
	for(let key in catalog_products){
		let producto= catalog_products[key];
		let category	= categorias[producto.categoria.hash_key].wp_id ? `--post_category=${categorias[producto.categoria.hash_key].wp_id}` : '';
		let html	= minify(producto.html_content, {
			collapseWhitespace: true,
			quoteCharacter: "'"
		});

		try {
			let post_exist	= execSync(`wp post list --field=ID --name=${WpHelper._textToSlug(producto.titulo)}`).toString('utf8');
			if(post_exist.trim() != ''){
				continue;
			}
			
			// let wp_id		= execSync(`wp post create --post_type=<post_type> --post_author=<post_author> --from-post --post_title="Mountain Photo 003" --post_status=publish --porcelain --<field>=<value>`).toString('utf8');
			let wp_id		= execSync(`wp post create --post_type=post --post_title="${producto.titulo}" ${category}  --post_status=publish --porcelain`).toString('utf8');
			wp_id			= Number(wp_id.trim());
			producto.wp_id	= wp_id;
			console.log(`New ID: ${wp_id} - Title: ${producto.titulo}`);

			// Vincular informacion para Advance Custom Field
			execSync(`echo -e "update_field('codigo', '${producto.codigo}', ${wp_id});" | wp shell`);
			execSync(`echo -e "update_field('link_whatsapp', 'navebinario.com', ${wp_id});" | wp shell`);
			execSync(`echo -e "update_field('texto_detalles', \\\"${html}\\\", ${wp_id});" | wp shell`);

			// Vinvular imagenes
			let extencion	= check_img_file.exec(producto.img)[0];
			if(fs.existsSync(join( store_path, `images/${producto.codigo}${extencion}`))){
				let dir_img	= join( store_path, `images/${producto.codigo}${extencion}`);
				execSync(`wp media import --post_id=${wp_id} --alt="${producto.titulo}" --featured_image --porcelain ${dir_img}`).toString('utf8');
			}

			// Vincular etiquetas al posteo
			for(let et of producto.etiqueta){
				if(etiquetas[et.hash_key]){
					execSync(`wp post term add ${wp_id} post_tag  ${etiquetas[et.hash_key].wp_id} --by=id`);
				}
			}
		} catch (error) {
			
		}
		catalog_products[key]	= producto;
	}
}

export default async ()=>{
	console.log('Inicio - Procesar Datos');
	
	switch (false) {
		case store_path:
			throw new Error('Debe pasar como argumento la ruta donde se hubican las imagenes de los productos.');
			break;
		case fs.existsSync(store_path):
			throw new Error(`El directorio ${store_path} no existe.`);
			break;
		case fs.existsSync(join(store_path, '/data.json')):
			throw new Error('El archivo data.json no existe o no esta disponible');
			break;
		case fs.existsSync(join(store_path, '/images')):
			console.log(`El directorio de ${join(store_path, '/images')} no existe y sera creado.`);
			fs.mkdirSync(join(store_path, '/images'));
			if(!fs.existsSync(join(store_path, '/images'))){
				throw new Error(`El directorio de ${join(store_path, '/images')} no existe o no esta disponible`);
			}
			break;
	}
	fs.mkdirSync(join(store_path, '/images'))
	
	try {
		let file_content	= fs.readFileSync(join( store_path, 'data.json'), 'utf-8');
		catalog_products	= JSON.parse(file_content);
	} catch (err) {
		console.error(err)
	}

	await compileData();
	await generateWpIdForCategoriesAndTags();
	await createAndLinkPost();

	let data_recompilada	= {catalog_products, categorias, etiquetas};
	try {
		fs.writeFileSync(join(store_path, 'data_recompilada.json'), JSON.stringify(data_recompilada), 'utf-8');
	} catch (err) {
		console.error(err)
	}

	console.log('Fin - Procesar Datos');
};
