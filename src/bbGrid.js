/*     
 *		bbGrid.js 2.0.0
 * 
 *		(c) 2012-2013 Minin Alexey, direct-fuel-injection.
 *		bbGrid may be freely distributed under the MIT license.
 *		For all details and documentation:
 *		http://direct-fuel-injection.github.com/bbGrid/
 *		
 *		Customizations by Russell Todd (North Point Ministries)
 *		https://github.com/npmweb/bbGrid
 */
(function () {

var bbGrid = this.bbGrid = {
    VERSION: '2.0.0',
    lang: 'en',
    locale: 'en-US',
    setDict: function (lang) {
        if (bbGrid.Dict.hasOwnProperty(lang)) {
            this.lang = lang;
        }
    },
    templateSettings: {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    },
    Dictionary: {
        'en': {
            loading: 'Loading...',
            noData: 'No rows',
            search: 'Search',
            rowsOnPage: 'Rows',
            page: 'Pg',
            all: 'All',
            prep: 'of'
        },
        'ru': {
            loading: 'Загрузка',
            noData: 'Нет записей',
            search: 'Поиск',
            rowsOnPage: 'Cтрок на странице',
            all: 'Все',
            page: 'Стр',
            prep: 'из'
        }
    }
};

}).call(this);
