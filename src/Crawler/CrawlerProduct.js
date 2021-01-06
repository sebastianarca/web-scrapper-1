import axios    from "axios";
import cheerio  from "cheerio";
const AxiosInstance = axios.create(); // Create a new Axios Instance

const getLinkProductPerPage = (page_products_url) => {
    let product_links = [];

    return AxiosInstance.get(page_products_url)
	.then((response) => {
		const html	= response.data;
        const $		= cheerio.load(html);

        let items	= $('div.shop-bottom-area .product-content');
		items.each((i, elem) => {
            let link                  = $(elem).children().first();
			product_links.push({
                link: link.attr('href'),
                descript: link.text(),
            });
		});
		return product_links;
	})
	.catch(() => false);
};

/**
 * @returns Array[{link:string, descript:string}]
 */
export default async (page_products_url)	=> {
    var page_number = 0;
    var products_links    = [];
    var result            = true;
    var paginator_link  = '';
    do {
        if(page_number == 0){
            paginator_link  = '';
        } else {
            paginator_link  = '?page='+(page_number+1);
        }
        try{
            result  = await getLinkProductPerPage(page_products_url+paginator_link);
            if(result !== false){
                products_links  = [...products_links, ...result];
            }
        } catch(e){
            result  = false;
        }
        page_number++;
    }while (result !== false);
    return products_links;
}