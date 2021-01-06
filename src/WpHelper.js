import { execSync } from "child_process";

/**
 * Devuelve un array de objetos Categoria con terminos
 * @returns array
 */
export default class WpHelper {
	/**
	 * @param {String} type 
	 * @param {String} text 
	 * @returns int|null
	 */
	static _execCreate(type, text){
		try {
			let slug= WpHelper._textToSlug(text);
			let ret = execSync(`wp term create ${type} "${slug}" --description="${text}"`).toString('utf8');
			ret		= (/\d+/g).exec(ret);
			return Number(ret.trim());
		} catch (error) {
			return null;
		}
	}

	/**
	 * @param {String} type 
	 * @param {String} text 
	 * @returns int|null
	 */
	static _execGet(type, text){
		try {
			let slug= WpHelper._textToSlug(text);
			let ret = execSync(`wp term get ${type} ${slug} --by=slug --format=json`).toString('utf8');
			ret		= JSON.parse(ret);
			return Number(ret.term_id);
		} catch (error) {
			return null;
		}
	}

	/**
	 * @param {String} text 
	 * @returns string
	 */
	static _textToSlug(text){
		if(typeof text !== 'string'){
			return;
		}
		text	= text
			.trim()
			.toLowerCase()
			.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/g, " ");

    	const charOrigin		= "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿźñ"
    	const charReplace		= "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyzn"
		const charOriginRegExp	= new RegExp(charOrigin.split("").join("|"), "g");

		return text
			.replace(
				charOriginRegExp,
				matchedCharacter => charReplace.charAt( charOrigin.indexOf(matchedCharacter) )
			)
			.replace(/œ/g, "oe")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+/, "")
			.replace(/-+$/, "");
	}

	/**
	 * @param {String} text 
	 * @returns int|null
	 */
	static createCategory(text){
		return WpHelper._execCreate('category', text);
	}

	/**
	 * @param {String} text 
	 * @returns int|null
	 */
	static getCategory(text){
		return WpHelper._execGet('category', text);
	}

	/**
	 * @param {String} text 
	 * @returns int|null
	 */
	static createTag(text){
		return WpHelper._execCreate('post_tag', text);
	}

	/**
	 * @param {String} text 
	 * @returns int|null
	 */
	static getTag(text){
		return WpHelper._execGet('post_tag', text);
	}
}