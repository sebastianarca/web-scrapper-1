import axios    from "axios";
import cheerio  from "cheerio";
const AxiosInstance = axios.create(); // Create a new Axios Instance

class Producto {
	constructor(prod_local_id,link_original,titulo,html_content,codigo,categoria,etiqueta, adicional, img){
        this.prod_local_id  = prod_local_id;
        this.link_original  = link_original;
		this.titulo			= titulo;
        this.html_content	= html_content;
        this.codigo         = codigo;
		this.categoria		= categoria;
		this.etiqueta		= etiqueta;
		this.adicional		= adicional;
		this.img			= img;
	}
}

/**
 * @returns Producto
 */
export default async (base_url, product, prod_local_id)	=> {
    return AxiosInstance.get(base_url + product.link)
	.then((response) => {
		const html	= response.data;
        const $		= cheerio.load(html);

        let container	= $('div.shop-area');
        let foto        = $(container[0]).find('.product-details-img > .tab-content img')[0];
        let img_src         = $(foto).attr('src');
        
        let content     = $($(container[0]).find('.product-details-content')[0]);
        let childs      = content.children();
        $(childs[0]).remove(); // 'titulo'
        let codigo      = $(childs[1]).text();
        $(childs[1]).remove(); // 'precio'
        $(childs[2]).remove(); // 'precio'
        $(childs[3]).remove(); // 'precio'
        
        $(content.find('.pro-details-quality')[0]).remove();
        
        let details_meta    = content.find('.pro-details-meta');
        $(details_meta[0]).remove(); // Localizar vendedora
        $(details_meta[1]).remove(); // Categoria

        let etiquetas       = [];
        $(details_meta[2]).find('li').each((i, elem)=>{
            let _link   = $($(elem).find('a')[0]);
            etiquetas.push({
                link: _link.attr('href'),
                text: _link.text()
            });
        });
        $(details_meta[2]).remove();
        let html_content    = $(content).html();

		return new Producto(
            prod_local_id,
            product.link.trim(),
            product.descripcion.trim(),
            html_content.trim(),
            codigo.trim(),
            product.categoria.trim(),
            etiquetas,
            '',
            img_src.trim()
        );
	})
	.catch(() => false);
}