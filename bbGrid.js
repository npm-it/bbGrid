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
;/* main collection class - handles all filtering and searching */
bbGrid.Collection = Backbone.Collection.extend({
    initialize: function(models, options) {
        console.log('** bbGrid.Collection.initialize() **');
    },
    parse: function(collectionJson) {
        console.log('** bbGrid.Collection.parse() **');
        this.fullJson = collectionJson;
        this.filtered = collectionJson;
        return collectionJson;
    },
    filtered: [],
    fullJson: [],
    filters: {},
    // should not be aware of columns and stuff
    filter: function (key, text, customFilter) {
        if (text == '') delete this.filters[key];
        else this.filters[key] = text;

        this.reset(this.fullJson,{silent:true}); // reset it to start off
        if (!_.isEmpty(this.filters)) {
            console.log('going to filter on these');
            console.info(this.filters);
            // how to reset it each time
            _.each(_.keys(this.filters), function(key) {
                var match = this.filters[key];
                this.filtered = _.filter(this.models, function (model) {
                    if (customFilter) return customFilter(model,match);
                    var val = model.get(key);
                    if (val) {
                        return ("" + val).toLowerCase().indexOf(match.toLowerCase()) >= 0;
                    } else {
                        return false;
                    }
                });
                this.reset(this.filtered,{silent:true});
            },this);

        }

        if (this.searchText != '') {
            this.filtered = _.filter(this.models, function (model) {
                var matches = false;
                var log = '** searching model '+model.get('nameFirst')+' ' +model.get('nameLast')+' for '+this.searchText;
                _.each(this.searchCriteria, function (criteria) {
                    if (matches === false) {
                        if (criteria.search !== false) {
                            matches = criteria.search(model,this.searchText);
                        } else { // default search
                            var val = model.get(criteria.property).toLowerCase().trim();
                            matches = val && ( val.lastIndexOf(this.searchText.toLowerCase().trim(), 0) === 0 );
                        }
                    }
                },this);
                console.log(log+' :: Did it match? '+matches);
                return matches;
            },this);
            this.reset(this.filtered,{silent:true});
        }

        this.trigger('reset');
    },
    searchText: '',
    searchCriteria: [],
    search: function(text) {
        // apply filters to the full list first, then search within
        if (this.searchText != text) {
            this.searchText = text;
            this.filter('bogus','');
        }
    }
});
;/* 
 * this is the main view, containing all of the elements (sub-views) that make up the grid
 */
bbGrid.View = Backbone.View.extend({
    viewOptions: ['autoFetch', 'buttons', 'colModel', 'container',
        'enableSearch', 'multiselect', 'rows', 'rowList', 'selectedRows',
        'subgrid', 'subgridAccordion', 'onRowClick', 'onRowDblClick', 'onReady',
        'onBeforeRender', 'onRowExpanded', 'onRowCollapsed', 'events'],
    initialize: function(options) {
        console.log('** initializing the bbGrid **');
        options || (options = {});
        // this results in infinte loop Backbone.View.apply(this, [options]);
        options.events = _.pick(options, _.union(this.viewOptions, _.values(options.events)));
        _.extend(this, options);
        console.log(this);
        this.setDict(bbGrid.lang);
        this.on('all', this.EventHandler, this);

        if (!this.json && !this.collection && !this.url) {
            throw new Error('A "collection" or "json" or "url" property must be specified');
        } else if (this.json) {
            this.collection = new bbGrid.Collection(this.json);
        } else if (this.url) {
            this.collection = new bbGrid.Collection();
            this.collection.url = this.url;
        } else {
            if (this.collection instanceof Backbone.Collection) {
                this.collection = _.extend(new bbGrid.Collection(), this.collection);
            }
        }

        // figure out which columns are searchable and sortable - both default to true
        _.each(this.colModel,function(col) {
            col.sortable = _.has(col,'sortable') ? col.sortable : true;
            col.searchable = (this.enableSearch && col.searchable !== false);
        },this);
        this.searchColumns = _.where(this.colModel, {searchable: true});

        if (!_.isEmpty(this.searchColumns)) {
            _.each(this.searchColumns,function(col) {
                this.collection.searchCriteria.push({
                    property: col.property,
                    search: col.customSearch || false,
                });
            },this);
        }

        var initSortCol = _.find(this.colModel, function(col) { return col.defaultSort; } );
        if (initSortCol) {
            this.rsortBy(initSortCol);
        }

        // go ahead and render the table here and then figure out adding the collection
        this.render();

        this.rowViews = {};
        this.selectedRows = [];
        this.currPage = 1;

        this.collection.on("all", this.CollectionEventHandler, this);
        this.enableFilter = _.compact(_.pluck(this.colModel, 'filter')).length > 0;
        this.autoFetch = !this.loadDynamic && this.autoFetch;
        if (this.autoFetch) {
            console.log('autofetch, baby!');
            console.info(this.collection);
            this.collection.fetch();
            this.autoFetch = false;
        }

        
        if (this.loadDynamic) {
            _.extend(this.collection.prototype, {
                parse: function (response) {
                    this.view.cntPages = response.total;
                    return response.rows;
                }
            });
        }

    },
    tagName: 'div',
    className: 'bbGrid',
    lang: bbGrid.lang,
    setDict: function (lang) {
        if (bbGrid.Dictionary.hasOwnProperty(lang)) {
            this.lang = lang;
        }
        this.dict = bbGrid.Dictionary[this.lang];
    },
    EventHandler: function (eventName, option1, option2, options) {
        switch (eventName) {
        case 'selected':
            if (this.subgrid) {
                this.toggleSubgridRow(option1, option2, options);
            } else {
                this.resetSelection();
            }
            break;
        case 'pageChanged':
            this.onPageChanged(option1);
            break;
        case 'sort':
            this.onSort(option1);
            break;
        case 'checkall':
            this.onCheckAll(option1);
            break;
        case 'rowDblClick':
            this.onDblClick(option1, option2);
            break;
        case 'filter':
            this.renderPage({silent: true});
            break;
        case 'refresh':
            this.renderPage();
            this.toggleLoading(false);
            break;
        default:
            break;
        }
    },
    CollectionEventHandler: function (eventName, model, collection, options) {
        var self = this;
        //console.log('CollectionEventHandler: event is '+eventName);
        switch (eventName) {
        case 'add':
            this.addModelsHandler(model, collection, options);
            break;
        case 'change':
            if (this.enableFilter) {
                this.filterBar.render();
            }
            break;
        case 'request':
            this.filterOptions = {};
            _.each(this.colModel, function (col, index) {
                self.colModel[index] = _.omit(col, 'defaultSort');
            });
            if (this.onBeforeCollectionRequest) {
                this.onBeforeCollectionRequest();
            }
            this.toggleLoading(true);
            break;
        case 'error':
            this.toggleLoading(false);
            break;
        case 'sync':
            this.toggleLoading(false);
            this.renderPage();
            break;
        case 'reset':
            this.toggleLoading(false);
            this.renderPage();
            break;
        case 'destroy':
            this.toggleLoading(false);
            break;
        default:
            break;
        }
    },
    render: function () {
        console.log('main:render()');
        if (this.width) {
            this.$el.css('width', this.width);
        }
        if (!this.$grid) {
            this.$grid = $('<table>');
            if (this.caption) {
                this.$grid.append('<caption>' + this.caption + '</caption>');
            }
            this.$grid.appendTo(this.el);
        }
        if (!this.$thead) {
            this.thead = new bbGrid.TheadView({view: this});
            this.$thead = this.thead.render();
            this.$grid.append(this.$thead);
        }
            
        if (!this.$tbody) {
            this.$tbody = $("<tbody>");
            this.$grid.append(this.$tbody);
        }

        if (!this.$tfoot) {
            this.tfoot = new bbGrid.TfootView({view: this});
            this.$tfoot= this.tfoot.render();
            this.$grid.append(this.$tfoot);
        }

        if (!this.$navBar) {
            this.navBar = new bbGrid.NavView({view: this});
            this.$navBar = this.navBar.render();
            this.$grid.after(this.$navBar);
            this.$loading = $('<div class="loading"><div class="loading-progress">' + this.dict.loading + '</div></div>');
            this.$navBar.prepend(this.$loading);
        }
        /*
        if (!this.$searchBar && this.enableSearch) {
            this.searchBar = new bbGrid.SearchView({view: this});
            this.$searchBar = this.searchBar.render();
            this.$navBar.append(this.$searchBar);
        }
        */
        $(this.container).append(this.$el);
        if (!this.autoFetch) {
            this.renderPage();
        }
        return this;
    },
    renderRow: function (model) {
        if (this.rows === _.size(this.rowViews)) {
            return false;
        }
        this.rowViews[model.id] = new bbGrid.RowView({model: model, view: this});
        this.$tbody.append(this.rowViews[model.id].render().el);
    },
    renderPage: function (options) {
        options = options || {silent: false};
        var self = this, interval;
        if (this.loadDynamic && !this.autoFetch && !options.silent) {
            this.collection.fetch({
                data: {page: self.currPage, rows: this.rows},
                wait: true,
                silent: true,
                success: function () {
                    self.renderPage({
                        silent: true,
                        interval: {s: 0, e: self.rows}
                    });
                }
            });
            return false;
        }
        this.selectedRows = [];
        if (this.onBeforeRender) {
            this.onBeforeRender();
        }
        if (!options.silent) {
            this.thead.render();
        }
        if (this.rows && this.pager) {
            this.pager.render();
        }
        interval = options.interval || this.getIntervalByPage(this.currPage);
        this.showCollection(this.collection.models.slice(interval.s, interval.e));
        if (!this.autoFetch && this.collection.length > 0) {
            this.toggleLoading(false);
        }
        if (this.onReady && !this.autoFetch) {
            this.onReady();
        }
        if (this.filterBar && !options.silent) {
            this.filterBar.render();
        }
    },
    setCollection: function (collection) {
        this.collection = collection || new Backbone.Collection();
        this.collection.on('all', this.collectionEventHandler, this);
    },
    sortBy: function (sortAttributes) {
        var attributes = sortAttributes;
        if (attributes.length) {
            this.collection.reset(this._sortBy(this.collection.models, attributes), { silent: true });
        }
    },
    _sortBy: function (models, attributes) {
        var attr, self = this, sortOrder;
        if (attributes.length === 1) {
            attr = attributes[0].name;
            sortOrder = attributes[0].sortOrder;
            models = _.sortBy(models, function (model) {
                return model.get(attr);
            });
            if (sortOrder === 'desc') {
                models.reverse();
            }
            return models;
        } else {
            attr = attributes[0];
            attributes = _.last(attributes, attributes.length - 1);
            models = _.chain(models).sortBy(function (model) {
                return model.get(attr);
            }).groupBy(function (model) {
                return model.get(attr);
            }).toArray().value();
            _.each(models, function (modelSet, index) {
                models[index] = self._sortBy(models[index], attributes, sortOrder);
            });
            return _.flatten(models);
        }
    },
    rsortBy: function (col) {
        // if we've already sorted on this column then just reverse and be done with it
        if (this.sortName && this.sortName === col.property) {
            this.sortOrder = (this.sortOrder === 'asc') ? 'desc' : 'asc';
            this.collection.models.reverse();
            return;
        }
        var sortType;
        this.sortName = col.property;
        this.collection.sortName = this.sortName;

        if (_.has(col,'customSort')) { 
            this.collection.comparator = col.customSort;
        } else {
            sortType = col.sortType || col.type || 'string';
            this.sortOrder = 'asc'; // starting a new col so just do asc
            switch (sortType) {
                case 'number':
                case 'decimal':
                case 'integer':
                case 'percent':
                case 'currency':
                    this.collection.comparator = function(model) {
                        var n = model.get(this.sortName);
                        if ( _.isNumber(n) ) return n;
                        if ( _.isString(n) ) {
                            // return either the float or int
                            var f = parseFloat(n);
                            var i = parseInt(n);
                            if (f == i) return i;
                            return f;
                        }
                        return 0; // blank lines are always last this way
                    };
                    break;
                case 'date':
                    this.collection.comparator = function(model) {
                        var d = model.get(this.sortName);
                        if (d === null) return 0;
                        var asDate = new Date(d);
                        return asDate.getTime();                        
                    };
                    break;
                case 'string':
                default:
                    this.collection.comparator = function(model) {
                        return ("" + model.get(this.sortName)).trim().toLowerCase();
                    };
                    break;
            }
        }
        this.collection.sort();
        if (col.defaultSort === 'desc') {
            this.collection.models.reverse(); // this should only happen first time through
            this.sortOrder = 'desc';
        }
    },
    onSort: function (event) {
        var $el, col, newSortAttr = true, self = this;
        if (!this.multisort) {
            $('thead th i', this.$el).removeClass();
        }
        $el = $(event.currentTarget);
        this.sortSequence || (this.sortSequence = []);
        col = _.find(this.colModel, function (col) { return col.label === $el.text(); });
        if (!col || !col.sortable) {
            return false;
        }
        col.sortOrder = (col.sortOrder === 'asc' ) ? 'desc' : 'asc';
        if (this.multisort) {
            this.sortSequence = _.map(this.sortSequence, function (attr) {
                if (attr.name === col.property) {
                    newSortAttr = false;
                    attr.sortOrder = col.sortOrder;
                }
                return attr;
            });
            if (newSortAttr) {
                this.sortSequence.splice(0, 0, {name: col.property, sortOrder: col.sortOrder});
            }
            this.sortBy(this.sortSequence);
        } else {
            _.each(this.colModel, function (column, index) {
                if (column.name !== col.property) {
                    delete self.colModel[index].sortOrder;
                }
            });
            this.rsortBy(col);
        }
        this.renderPage();
    },
    getIntervalByPage: function (page) {
        var interval = {};
        if (this.rows) {
            interval.s = (page - 1) * this.rows;
            interval.e = page * this.rows;
            if (interval.e > this.collection.length) {
                interval.e = this.collection.length || this.rows;
            }
        } else {
            interval = {s: 0, e: this.collection.length};
        }
        return interval;
    },
    clearGrid: function () {
        if (this.subgridAccordion) {
            delete this.$subgridContainer;
        }
        _.each(this.rowViews, function (view) {
            view.remove();
        });
        this.rowViews = {};
        this.$tbody.empty();
    },
    toggleLoading: function (isToToggle) {
        if (isToToggle === undefined) {
            isToToggle = true;
        }
        this.$navBar.show();
        if (this.$buttonsContainer) {
            this.$buttonsContainer.toggle(!isToToggle);
        }
        if (this.$pager) {
            this.$pager.toggle(!isToToggle);
        }
        if (this.$searchBar) {
            this.$searchBar.toggle(!isToToggle);
        }
        if (!this.rows && !this.buttons && !isToToggle) {
            this.$navBar.hide();
        }
        if (this.filterBar) {
            $('.bbGrid-filter-bar', this.$el).find('input,select').prop('disabled', isToToggle);
        }
        this.$loading.toggle(isToToggle);
    },
    showCollection: function (collection) {
        var self = this;
        this.clearGrid();
        _.each(collection, function (model) {
            self.renderRow(model);
        });
        if (collection.length === 0 && !this.autoFetch) {
            this.$tbody.html('<tr class="noRows"><td colspan="' + this.colLength + '">' + this.dict.noData + '</td></tr>');
        }
    },
    setRowSelected: function (options) {
        var event = {}, className;
        options || (options = {});
        if (options.id && _.has(this.rowViews, options.id)) {
            if (this.multiselect) {
                className = '.bbGrid-multiselect-control';
            }
            event.currentTarget = $('td' + className, this.rowViews[options.id].$el).first()[0];
            event.isShown = options.isShown || false;
            this.rowViews[options.id].setSelection(event);
        }
    },
    toggleSubgridRow: function (model, $el, options) {
        var View, colspan, subgridRow, subgridContainerHtml;
        options = options || {};
        View = this.subgridAccordion ? this : this.rowViews[model.id];
        if (this.subgridAccordion) {
            $('tr', this.$el).removeClass('warning');
            _.each(this.rowViews, function (row) {
                if(row.model.id !== model.id) {
                    row.selected = false;
                }
            });
        }
        if (View.$subgridContainer) {
            $('td.bbGrid-subgrid-control i', View.$subgridContainer.prev()).removeClass('icon-minus');
            View.$subgridContainer.remove();
            delete View.$subgridContainer;
            if (View.expandedRowId === model.id && !options.isShown) {
                if (this.onRowCollapsed) {
                    this.onRowCollapsed($('td', View.$subgridContainer)[1], model.id);
                }
                return false;
            }
        }
        $('td.bbGrid-subgrid-control i', $el).addClass('icon-minus');
        colspan = this.multiselect ? 2 : 1;
        subgridRow = _.template('<tr class="bbGrid-subgrid-row"><td colspan="<%=extra%>"/><td colspan="<%=colspan %>"></td></tr>', null, bbGrid.templateSettings);
        subgridContainerHtml = subgridRow({ extra: colspan, colspan: this.colLength - colspan });
        View.$subgridContainer = $(subgridContainerHtml);
        $el.after(View.$subgridContainer);
        View.expandedRowId = model.id;
        if (this.onRowExpanded) {
            this.onRowExpanded($('td', View.$subgridContainer)[1], model.id);
        }
    },
    onCheckAll: function (event) {
        var checked = $(event.target).is(':checked');
        _.each(this.rowViews, function (view) {
            if (view.selected !== checked) {
                if (!view.model.get('cb_disabled')) {
                    view.trigger('select');
                }
            }
        });
    },
    addModelsHandler: function (model, collection, options) {
        var index = this.collection.indexOf(model);
        if ((index + 1) === this.collection.length) {
            this.renderPage();
        }
    },
    onDblClick: function (model, $el) {
        if (this.onRowDblClick) {
            this.onRowDblClick(model);
        }
    },
    onPageChanged: function (event) {
        var $el = $(event.currentTarget),
            className = $el.attr('class'),
            page;
        switch (className) {
        case 'bbGrid-page-input':
            page = parseInt($el.val(), 10);
            break;
        case 'left':
            page = this.currPage - 1;
            break;
        case 'right':
            page = this.currPage + 1;
            break;
        case 'first':
            page = 1;
            break;
        case 'last':
            page = this.cntPages;
            break;
        default:
            page = this.currPage;
        }
        if (page > this.cntPages || page <= 0) {
            return false;
        }
        if (this.currPage !== page) {
            this.currPage = page;
            $('div.bbGrid-pager li', this.$el).removeClass('active');
            $('.bbGrid-page-input', this.$pager).val(this.currPage);

            if (this.currPage === 1) {
                $('div.bbGrid-pager a.left,.first', this.$el).parent().addClass('active');
            }
            if (this.currPage >= this.cntPages) {
                $('div.bbGrid-pager a.right,.last', this.$el).parent().addClass('active');
            }
            this.renderPage({silent: !this.loadDynamic});
        }
    },
    resetSelection: function () {
        if (!this.multiselect) {
            $('tr', this.$el).removeClass('warning');
        }
    },
    getSelectedModels: function () {
        var self = this;
        return _.map(this.selectedRows, function (id) { return self.collection.get(id); });
    }
});

;bbGrid.TheadView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'click th.sortable': 'onSort',
            'click input[type=checkbox]': 'onAllCheckbox'
        };
        this.view = options.view;
    },
    tagName: 'thead',
    oldIconAfterLabel: '<i <% \
                    if (col.sortOrder === "asc" ) {%>class="icon-chevron-up"<%} else \
                        if (col.sortOrder === "desc" ) {%>class="icon-chevron-down"<% } %>/>',
    template: _.template(
        '<% if (isMultiselect) {%><th style="width:15px"><input type="checkbox"></th><%}\
            if(isContainSubgrid) {%><th style="width:15px"/><%}\
            _.each(cols, function (col) {%>\
                <th <%if (col.width) {%>style="width:<%=col.width%>"<%}%> class="th-<%=col.property%><%if (col.sortable !== false) {%> sortable<%} if (sortCol == col.property) {%> sorted <%= sortOrder %><%}%>"><span class="arrows"><i class="up"/><i class="down"/></span><%=col.label%></th>\
        <%})%>', null, bbGrid.templateSettings
    ),
    onAllCheckbox: function (event) {
        this.view.trigger('checkall', event);
    },
    onSort: function (event) {
        /* ?? DO SOMETHING HERE OR IN THE ORIGINAL ON SORT TO ADD CLASS */
        this.view.trigger('sort', event);
    },
    render: function () {
        var cols, theadHtml;
        if (!this.$headHolder) {
            this.$headHolder = $('<tr/>', {'class': 'bbGrid-grid-head-holder'});
            this.$el.append(this.$headHolder);
        }
        cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
        cols = _.map(cols, function (col) { col.label = col.label || col.property; return col; });
        console.info(cols);
        this.view.colLength = cols.length + (this.view.multiselect ? 1 : 0) + (this.view.subgrid ? 1 : 0);
        theadHtml = this.template({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            cols: cols,
            sortCol: this.view.sortName,
            sortOrder: this.view.sortOrder
        });
        this.$headHolder.html(theadHtml);
        if (!this.view.$filterBar && this.view.enableFilter) {
            this.view.filterBar = new bbGrid.FilterView({ view: this.view });
            this.view.$filterBar = this.view.filterBar.render();
            this.$el.append(this.view.$filterBar);
        }
        return this.$el;
    }
});

;bbGrid.RowView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            "click td[class!=bbGrid-actions-cell]": "setSelection",
            "dblclick td[class!=bbGrid-actions-cell]": "onDblClick"
        };
        this.view = options.view;
        this.on('select', this.setSelection);
        this.model.on('remove', this.modelRemoved, this);
        this.model.on('change', this.modelChanged, this);
    },
    tagName: 'tr',
    template: _.template(
        '<% if (isMultiselect) {%>\
        <td class="bbGrid-multiselect-control"><input type="checkbox" <% if (isDisabled) { %>disabled="disabled"<% } %><% if (isChecked) {%>checked="checked"<%}%>></td>\
        <%} if (isContainSubgrid) {%>\
            <td class="bbGrid-subgrid-control">\
                <i id="<%= (isSelected) ? "icon-minus" : "icon-plus" %>">\
            </td>\
        <%} _.each(values, function (cell) {%>\
            <td<%= cell.attributes %>>\
                <%=cell.value%>\
            </td>\
        <%})%>', null, bbGrid.templateSettings
    ),
    render: function () {
        var self = this, isChecked, isDisabled, html,
            cols = _.filter(this.view.colModel, function (col) {return !col.hidden;});
        isChecked = ($.inArray(this.model.id, this.view.selectedRows) >= 0);
        isDisabled = this.model.get('cb_disabled') || false;
        html = this.template({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            isSelected: this.selected || false,
            isChecked: isChecked,
            isDisabled: isDisabled,
            values: _.map(cols, function (cell) {
                cell.align='';
                cell.attr = cell.attr || {};
                if (cell.render) {
                    cell.value = cell.render(self.model, self.view);
                } else {
                    cell.value = self.model.get(cell.property);
                    // provide some custom formatters for common types
                    if (_.has(cell,'type')) {
                        switch(cell.type) {
                            case 'boolean':
                                cell.value = ( cell.value === 1 || 
                                            ( _.isString(cell.value) && (cell.value.toLowerCase() === 'true' || cell.value === '1') ) || 
                                            cell.value === true ) ? "True" : "False";
                                break;
                            case 'currency': // add currency options
                                cell.value = self.currency(cell);
                                if (!_.has(cell.attr,"align")) cell.attr.align = 'right';
                                break;
                            case 'number': // add number options
                            case 'decimal': // add number options
                                cell.value = self.number(cell);
                                if (!_.has(cell.attr,"align")) cell.attr.align = 'right';
                                break;
                            case 'integer': 
                                cell.minimumFractionDigits = 0;
                                cell.value = self.number(cell);
                                if (!_.has(cell.attr,"align")) cell.attr.align = 'right';
                                break;                                
                            case 'percent': 
                                // classes or styles ? cell.style = 'percent';
                                cell.value = self.number(cell);
                                if (!_.has(cell.attr,"align")) cell.attr.align = 'right';
                                break;                                
                            case 'email': // add mailto options??
                                cell.value = '<a href="mailto:'+cell.value+'">'+cell.value+'</a>';
                                break;
                            case 'url': // add target options and check for http??
                                cell.value = '<a href="'+cell.value+'">'+cell.value+'</a>';
                                break;
                            case 'date':
                                cell.value = self.date(cell);
                                break;
                            case 'time':
                                cell.value = self.date(cell);
                                break;
                            default:
                        }

                    }
                }
                cell.attributes = '';
                _.each(_.keys(cell.attr),function(k) { 
                    cell.attributes += ' ' + k + '="'+_.property(k)(cell.attr)+'"'; 
                });
                return cell;
            })
        });
        if (isChecked) {
            this.selected = true;
            this.$el.addClass('warning');
        }
        if (_.has(self.model,'id')) this.$el.attr({id:"row-"+self.model.id});
        this.$el.html(html);
        return this;
    },
    currency: function(options) {
        options = options || {};
        return this.number(_.extend({style:'currency',currency:'USD'},options));
    },
    number: function(options) {
        var formatter = new Intl.NumberFormat('en-US',_.extend({
          minimumFractionDigits: 2,
          style: 'decimal'
        },options));
        return formatter.format(options.value);
    },
    date: function(options) {
        var format = _.has(options,'format') ? options.format : 'm/d/Y h:i:s';
        var dt = _.isString(options.value) ? new Date(options.value) : options.value; 
        return date(format,dt);
    },
    modelRemoved: function (model) {
        var self = this,
            view = this.view.subgridAccordion ? this.view : this.view.rowViews[model.id];
        if (view && view.$subgridContainer) {
            view.$subgridContainer.remove();
        }
        this.view.selectedRows = _.reject(this.view.selectedRows, function (rowId) {
            return rowId === self.model.id;
        });
        this.remove();
    },
    modelChanged: function () {
        this.render();
        if (this.view.onReady && !this.view.autoFetch) {
            this.view.onReady();
        }
    },
    onDblClick: function (event) {
        this.view.trigger("rowDblClick", this.model, this.$el);
    },
    setSelection: function (options) {
        options = options || {};
        var target = options.currentTarget || undefined,
            className = target ? target.className : undefined,
            self = this,
            $control = $(target).closest('tr').find('td.bbGrid-multiselect-control input');
        if ($control && $control.is(':disabled') && className !== 'bbGrid-subgrid-control') {
            return false;
        }
        if (!(this.view.multiselect && this.view.subgrid && className !== 'bbGrid-subgrid-control')) {
            this.view.trigger("selected", this.model, this.$el, options);
        }
        if (this.view.multiselect && className === 'bbGrid-subgrid-control') {
            return false;
        }
        this.$el.addClass('warning');
        if (this.view.multiselect || this.view.subgrid) {
            this.selected = this.selected ? false : true;
            this.selected = options.isShown || this.selected;
            $('input[type=checkbox]', this.$el).prop('checked', this.selected);
            if (!this.selected && !options.isShown) {
                this.$el.removeClass('warning');
            }
        } else {
            this.selected = true;
        }
        if (this.selected || options.isShown) {
            if (this.view.multiselect || (this.view.subgrid && !this.view.subgridAccordion)) {
                this.view.selectedRows.push(this.model.id);
            } else {
                this.view.selectedRows = [this.model.id];
            }
        } else {
            this.view.selectedRows = _.reject(this.view.selectedRows,
                function (rowId) {
                    return rowId === self.model.id;
                });
        }
        if (this.view.onRowClick) {
            this.view.onRowClick(this.model, options);
        }
    },
});
;bbGrid.FilterView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'keyup input[name=filter]': 'onFilter',
            'change select[name=filter]': 'onFilter'
        };
        this.view = options.view;
        options.view.filterOptions = {};
        this.rendered = false;
    },
    tagName: 'tr',
    template: _.template(
        '<% if (isMultiselect) {%>\
            <td></td>\
        <%} if (isContainSubgrid) {%>\
            <td></td>\
        <% } %>\
        <% console.log("***"); console.info(filterOptions); _.each(cols, function (col) {%>\
            <td>\
                <%if (col.filter) {%>\
                    <<% if (col.filterType === "input") \
                        {%>input<%}else{%>select<%\
                        }%> class="<%if (col.filterProperty) {%><%=col.filterProperty%><%}else{%><%=col.property %><%}%>" \
                        name="filter" type="text" value="<%=filterOptions[col.property]%>">\
                <% if (col.filterType !== "input") {%>\
                <option value=""><%=dict.all%></option>\
                    <% _.each(options[col.property], function (option) {%>\
                        <option value="<%=option%>"<% if (filterOptions[col.property] == option) print(\' selected\'); %>><%=option%></option>\
                    <%})%>\
                </select><%}%>\
                <%}%>\
            </td>\
        <%})%>', null, bbGrid.templateSettings),
    onFilter: function (e) {
        var $f = $(e.currentTarget);
        var key = $f.attr('class');
        var text = $.trim($f.val());
        this.view.collection.filter(key,text);
        /*
        var text, self = this,
            collection = new Backbone.Collection(this.view.collection.models);
        this.view.tfoot.searchBar.render(); // TODO: why?
        this.view.setCollection(collection);
        _.each($('*[name=filter]', this.$el), function (el) {
            text = $.trim($(el).val());
            self.view.filterOptions[el.className] = text;
        });
        if (_.keys(this.view.filterOptions).length) {
            self.filter(collection, _.clone(this.view.filterOptions));
        }
        this.view.trigger('filter');
        */
    },
    filter: function (collection, options) {
        var keys = _.keys(options), option, filterCol,
            key = _.first(keys),
            text = options[key];
        if (!keys.length) {
            return collection;
        }
        delete options[key];
        if (text.length > 0) {
            // figure out which column we are filtering on
            filterCol = _.findWhere(this.view.colModel,{filterProperty:key});
            if (filterCol) filterCol.currentFilter = text;
            collection.reset(_.filter(collection.models, function (model) {
                if (filterCol && filterCol.customFilter) return filterCol.customFilter(model,text);
                option = model.get(key);
                if (option) {
                    return ("" + option).toLowerCase().indexOf(text.toLowerCase()) >= 0;
                } else {
                    return false;
                }
            }), {silent: true});
        }
        this.filter(collection, options); // call it again til we've gone through all of 'em
    },
    render: function () {
        if (this.rendered) return this.$el;
        var options = {}, self = this, filterBarHtml;
        _.each(this.view.colModel, function (col) {
            if (col.filter) {
                if (col.filterOptions) options[col.property] = col.filterOptions;
                else options[col.property] = _.uniq(self.view.collection.pluck(col.filterProperty || col.property));
            }
        });
        filterBarHtml = this.template({
            dict: this.view.dict,
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            filterOptions: this.view.filterOptions,
            cols: _.filter(this.view.colModel, function (col) {return !col.hidden; }),
            options: options
        });
        this.$el.html(filterBarHtml);
        this.rendered = true;
        return this.$el;
    }
});    

;bbGrid.TfootView = Backbone.View.extend({
    initialize: function (options) {
        this.view = options.view;
    },
    tagName: 'tfoot',
    render: function () {
        var cols, leftCols, rightCols;
        cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
        cols = _.map(cols, function (col) { col.label = col.label || col.property; return col; });
        this.view.colLength = cols.length + (this.view.multiselect ? 1 : 0) + (this.view.subgrid ? 1 : 0);
        leftCols = Math.ceil( this.view.colLength / 2 );
        rightCols = this.view.colLength - leftCols;

        // PUT THE FILTER & SEARCH IN A NEW ROlee

        if (!this.$footHolder) {
            this.$footHolder = $('<tr/>');
            this.$el.append(this.$footHolder);
        }
        if (!this.view.$pager && this.view.rows) {
            this.view.pager = new bbGrid.PagerView({ view: this.view, colspan: leftCols });
            this.view.$pager = this.view.pager.render();
            this.$footHolder.append(this.view.$pager);
        }
        if (!this.$searchBar && this.view.enableSearch) {
            this.searchBar = new bbGrid.SearchView({view: this.view, colspan: rightCols });
            this.$searchBar = this.searchBar.render();
            this.$footHolder.append(this.$searchBar);
        }
        return this.$el;
    }
});

;bbGrid.PagerView = Backbone.View.extend({

    initialize: function (options) {
        this.events = {
            'click a': 'onPageChanged',
            'change .bbGrid-pager-rowlist': 'onRowsChanged',
            'change .bbGrid-page-input': 'onPageChanged'
        };
        this.view = options.view;
        this.colspan = options.colspan;
    },
    tagName: 'td',
    template: _.template(
        '<div class="bbGrid-pager">\
            <a class="first<%if (page > 1) {%> active<%}%>"><i class="general foundicon-left-arrow"/></a>\
            <a class="prev<%if (page > 1) {%> active<%}%>"><i id="icon-backward"/>Prev</a>\
            <span class="bbGrid-page-counter"><%=dict.page%></span>\
            <input class="bbGrid-page-input" value="<%=page%>" type="text" style="display:inline;">\
            <span class="bbGrid-page-counter-right"> <%=dict.prep%> <%=cntpages%> </span>\
            <a class="next<%if (page < cntpages) {%> active<%}%>"><i id="icon-forward"/>Next</a>\
            <a class="last<%if (page < cntpages) {%> active<%}%>"><i id="icon-step-forward"/>Last</a>\
        <% if (rowlist) {%>\
        <span class="bbGrid-pager-rowlist-label"><%=dict.rowsOnPage%>:</span>\
        <select class="bbGrid-pager-rowlist">\
            <% _.each(rowlist, function (val) {%>\
                <option <% if (rows === val) {%>selected="selected"<%}%>><%=val%></option>\
            <%})%>\
        </select>\
        <%}%>\
        </div>\
        ', null, bbGrid.templateSettings

    ),
    onRowsChanged: function (event) {
        this.view.rows = parseInt($(event.target).val(), 10);
        this.render();
        this.view.render();
    },
    onPageChanged: function (event) {
        this.view.trigger('pageChanged', event);
    },
    initPager: function () {
        var pagerHtml;
        if (!this.view.loadDynamic) {
            this.view.cntPages = Math.ceil(this.view.collection.length / this.view.rows);
        }
        if (this.view.currPage > 1 && this.view.currPage > this.view.cntPages) {
            this.view.currPage = this.view.cntPages;
        }
        this.view.cntPages = this.view.cntPages || 1;
        pagerHtml = this.template({
                dict: this.view.dict,
                page: this.view.currPage,
                cntpages: this.view.cntPages,
                rows: this.view.rows,
                rowlist: this.view.rowList || false
            });
        if (!this.view.rowList) {
            this.$el.addClass('bbGrid-pager-container-norowslist');
        }
        this.$el.html(pagerHtml).attr({colspan:this.colspan});
    },
    render: function () {
        this.initPager();
        return this.$el;
    }
});

;/*
 * This encapsulates the search field and its events
 */
bbGrid.SearchView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'keyup input[name=search]': 'onSearch',
        };
        this.grid = options.view;
        this.colspan = options.colspan;
    },
    tagName: 'td',
    template: _.template(
        '<input name="search" type="text" placeholder="<%=dict.search%>">', null, bbGrid.templateSettings
    ),
    onSearch: function (event) {
        var self = this,
            $el = $(event.target),
            text = $el.val();
        console.log('search on "'+text+'"');
        this.grid.collection.search(text);
        //this.view.collection.trigger('reset');
    },
    render: function () {
        var searchBarHtml = this.template({
            dict: this.grid.dict,
        });
        this.$el.html(searchBarHtml).attr({colspan:this.colspan});
        return this.$el;
    }
});

;bbGrid.NavView = Backbone.View.extend({
    initialize: function (options) {
        this.view = options.view;
    },
    tagName: 'div',
    render: function () {
        if (this.view.buttons) {
            var self = this, btn, btnHtml, $button;
            this.view.$buttonsContainer = $('<div/>', {'class': 'bbGrid-navBar-buttonsContainer btn-group span'});
            this.view.buttons = _.map(this.view.buttons, function (button) {
                if (!button) {
                    return undefined;
                }
                btn = _.template('<button <%if (id) {%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>', null, bbGrid.templateSettings);
                btnHtml = button.html || btn({id: button.id, title: button.title});
                $button = $(btnHtml).appendTo(self.view.$buttonsContainer);
                if (button.onClick) {
                    button.onClick = _.bind(button.onClick, self.view.collection);
                    $button.click(button.onClick);
                }
                return $button;
            });
            this.$el.append(this.view.$buttonsContainer);
        }
        /*
        if (!this.view.$pager && this.view.rows) {
            this.view.pager = new bbGrid.PagerView({ view: this.view });
            this.view.$pager = this.view.pager.render();
            this.view.$pager.appendTo(this.$el);
        }
        */
        return this.$el;
    }
});

