import axios	from "axios";
import cheerio	from "cheerio";
const AxiosInstance = axios.create(); // Create a new Axios Instance

const CATEGORIA 	= 1;
const TERMINO   	= 2;

/**
 * Define una Categoria. URL + Nombre + Terminos
 */
class Categoria {
	constructor(name,url,terminos){
		this.name   = name;
		this.url    = url;
		this.terminos=terminos;
		this.type   = CATEGORIA;
	}
}
/**
 * Define un Termino. URL + Name
 */
class Termino {
	constructor(name,url){
		this.name   = name;
		this.url    = url;
		this.type   = TERMINO;
	}
}
const itemsMenu = [];

/**
 * Devuelve un array de objetos Categoria con terminos
 * @returns array
 */
export default async (url)	=> {
	return AxiosInstance.get(url)
	.then((response) => {
		const html	= response.data;
		const $		= cheerio.load(html);
		let items	= $('.main-menu > nav > ul > li');
		items.each((i, elem) => {
			let link                  = $(elem).children().first();
			let submenu               = $(elem).children().last();
			submenu                   = submenu.find('li');

			let terminos    = [];
			submenu.each((j, elem2) => {
				let link2                  = $(elem2).children().first();
				terminos.push(new Termino(link2.text(), link2.attr('href')))
			});
			itemsMenu.push(new Categoria(link.text(), link.attr('href'), terminos))
		});
		return itemsMenu;
	})
	.catch((e)=>{
		throw new Error(e);
	});
}