
// 'use strict';
import fs from "fs";
import { exit } from "process";
import crypto from "crypto";
// import { promisify } from "util";
import { execSync } from "child_process";
import { join, dirname, resolve } from "path";
import axios    from "axios";
import { minify } from "html-minifier";
import WpHelper from "./WpHelper.js";


const url			= 'https://www.arbell.com.ar'; // URL we're scraping
const save_file		= '/file_storage/data.json';
const store_images	= '/file_storage/images/';
// const __dirname		= resolve(dirname(''));
let catalog_products= [];

const ruta_img_arg	= process.argv[2] || null;
const ruta_stor_arg	= process.argv[3] || null;
if(!ruta_img_arg) {
	console.log('Debe pasar como argumento la ruta donde se hubican las imagenes de los productos.');
	exit();
}


try {
	let file_content	= fs.readFileSync(join( __dirname, save_file), 'utf-8');
	catalog_products	= JSON.parse(file_content);
} catch (err) {
	console.error(err)
}

const sleep	= (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
const descargarImagen	= (url_image, store_name) => 
	axios({url:url_image, responseType: 'stream'})
	.then(resp => new Promise((rs, rj) => {
		resp.data
		.pipe(fs.createWriteStream(join( ruta_img_arg, `${store_name}`)))
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
var errores_img = 0;
var check_img_file = /\.[a-z]{3}$/;
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
		if(!fs.existsSync(join( ruta_img_arg, `${producto.codigo}${extencion}`))){
			try{
				// await descargarImagen(producto.img, `${producto.codigo}${extencion}`);
				errores_img++;
			}catch(e){
				errores_img++;
			}
		}
	}

	catalog_products[key]	= producto;
}

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

for(let key in catalog_products){
	let producto= catalog_products[key];	
	let cate	= categorias[producto.categoria.hash_key].wp_id ? `--post_category=${categorias[producto.categoria.hash_key].wp_id}` : '';
	let html	= minify(producto.html_content, {
		collapseWhitespace: true,
		quoteCharacter: "'"
	});

	try {
		// let wp_id		= execSync(`wp post create --post_type=<post_type> --post_author=<post_author> --from-post --post_title="Mountain Photo 003" --post_status=publish --porcelain --<field>=<value>`).toString('utf8');
		let wp_id		= execSync(`wp post create --post_type=post --post_title="${producto.titulo}" ${cate}  --post_status=publish --porcelain`).toString('utf8');
		wp_id			= Number(wp_id.trim());

		console.log(wp_id);
		

		producto.wp_id	= wp_id;
		execSync(`echo -e "update_field('codigo', '${producto.codigo}', ${wp_id});" | wp shell`);
		execSync(`echo -e "update_field('link_whatsapp', 'navebinario.com', ${wp_id});" | wp shell`);
		execSync(`echo -e "update_field('texto_detalles', \\\"${html}\\\", ${wp_id});" | wp shell`);
	
		let extencion	= check_img_file.exec(producto.img)[0];
		if(fs.existsSync(join( ruta_img_arg, `${producto.codigo}${extencion}`))){
			let dir_img	= join( ruta_img_arg, `${producto.codigo}${extencion}`);
			execSync(`wp media import --post_id=${wp_id} --alt="${producto.titulo}" --featured_image --porcelain ${dir_img}`).toString('utf8');
		}

		for(let et of producto.etiqueta){
			if(etiquetas[et.hash_key]){
				execSync(`wp post term add ${wp_id} post_tag  ${etiquetas[et.hash_key].wp_id} --by=id`);
			}
		}
	} catch (error) {
		
	}
	catalog_products[key]	= producto;
}

let data_recompilada	= {catalog_products, categorias, etiquetas};
// console.log(data_recompilada);
console.log('Fin de proceso');



(()=>{
	return;
	if(!ruta_stor_arg){
		return;
	}
	try {
		fs.writeFileSync(join(ruta_stor_arg, 'data_recompilada.json'), JSON.stringify(data_recompilada), 'utf-8');
	} catch (err) {
		console.error(err)
	}
})();


/**
 * - Crear Categoria
 * - Crear Etiquetas
 * - Crear Imagenes
 * - Crear Producto vinculado a un post  type y a los IDs  de las cosas creadas anteriormente
 * 
 * 
 * 
 * wp term create category Apple --description="A type of fruit"
 * wp term create term Apple --description="A type of fruit" 
 * 
 * 
 * 
 * $post_id = wp post create --post_type=<post_type> --post_author=<post_author> --from-post --post_title="Mountain Photo 003" --post_status=publish --porcelain --<field>=<value>
 * 
 * [--post_category=<post_category>]
	Array of category names, slugs, or IDs. Defaults to value of the ‘default_category’ option.
 * [--tags_input=<tags_input>]
    Array of tag names, slugs, or IDs. Default empty.
 * wp media import --post_id=<post_id> --title=<title> --alt=<alt_text> --featured_image --porcelain
 *
 * wp media import --title="Mountain 003" --alt="Mountain 003" /Users/JDoe/Desktop/mountain_003.jpg --post_id=$(wp post create --post_title="Mountain Photo 003" --post_status=publish --porcelain)
 * 
 * 
 * 
 * 
 * 
 * 
 * <wp:postmeta>
		<wp:meta_key><![CDATA[texto_detalles]]></wp:meta_key>
		<wp:meta_value><![CDATA[<p>Esto Es una Prueba texto Detalles</p>]]></wp:meta_value>
		</wp:postmeta>
		
		<wp:postmeta>
		<wp:meta_key><![CDATA[link_whatsapp]]></wp:meta_key>
		<wp:meta_value><![CDATA[test.com]]></wp:meta_value>
		</wp:postmeta>
		
		
		
		<wp:postmeta>
		<wp:meta_key><![CDATA[divi_acf_gallery]]></wp:meta_key>
		<wp:meta_value><![CDATA[a:2:{i:0;s:3:"114";i:1;s:3:"104";}]]></wp:meta_value>
		</wp:postmeta>
*/

