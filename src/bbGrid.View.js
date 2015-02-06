/*
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

        // TODO: does there need to be a defaults attribute on this object
        this.minimalHeader = false;

        // this results in infinte loop Backbone.View.apply(this, [options]);
        options.events = _.pick(options, _.union(this.viewOptions, _.values(options.events)));
        _.extend(this, options);
        this.setDict(bbGrid.lang);
        this.on('all', this.EventHandler, this);

        if (!this.json && !this.collection && !this.url) {
            throw new Error('A "collection" or "json" or "url" property must be specified');
        } else if (this.json) {
            this.collection = new bbGrid.Collection(this.json);
            this.collection.refreshCollection();
        } else if (this.url) {
            this.collection = new bbGrid.Collection();
            this.collection.url = this.url;
        } else {
            if (this.collection instanceof Backbone.Collection) {
                this.collection = _.extend(new bbGrid.Collection(), this.collection);
            }
            this.collection.refreshCollection();
        }
        this.collection.on("all", this.CollectionEventHandler, this);
        console.log('bbGrid.View.initialize: here is the collection');
        console.info(this.collection);

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

        this.cssInjected = false;
        if (!this.css) {
            this.css = 'default';
        }

        this.rowViews = {};
        this.selectedRows = [];
        this.currPage = 1;

        this.enableFilter = _.compact(_.pluck(this.colModel, 'filter')).length > 0;

        // go ahead and render the table here and then figure out adding the collection
        this.render();

        this.autoFetch = !this.loadDynamic && this.autoFetch;
        if (this.autoFetch) {
            this.collection.fetch();
            this.autoFetch = false;
        }

        // ?? todo - should this do this?
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
        case 'sync':
            this.collection.fetch({reset:true});
            break;
        default:
            break;
        }
    },
    CollectionEventHandler: function (eventName, model, collection, options) {
        var self = this;
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
            // this property is needed to do the defaultSort after loading the collection
            // _.each(this.colModel, function (col, index) {
            //     self.colModel[index] = _.omit(col, 'defaultSort');
            // });
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
            this.collection.refreshCollection();
            // added jcj 2014-07-11 to allow default desc sort
            var initSortCol = _.find(this.colModel, function(col) { return col.defaultSort; } );
            if( initSortCol && initSortCol.defaultSort == 'desc' ) {
                this.collection.models.reverse();
            }
            // end addition
            this.renderPage();
            break;
        case 'reset':
            this.toggleLoading(false);
            // added jcj 2014-07-11 to allow default desc sort
            if('desc' == this.sortOrder) {
                this.collection.models.reverse();
            }
            // end addition
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
        if (this.width) {
            this.$el.css('width', this.width);
        }
        if (this.css && !this.cssInjected) {
            // inject the styles
            switch (this.css) {
                case 'bootstrap':
                case 'foundation':
                    /*var $cssLink = $("<link>").attr({rel:'stylesheet',href:'//netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css'});
                    $("head").append($cssLink);*/
                    this.addHeaderStyles();
                    break;
                case 'default':
                    this.addDefaultStyles();
                    break;
            }
            this.cssInjected = true;
        }
        if (!this.$grid) {
            this.$grid = $('<table>');
            var tableClass = '';
            if (this.css == 'bootstrap') {
                tableClass += ' table table-condensed table-striped table-bordered'
            }
            if (this.tableClass) {
              tableClass += ' '+this.tableClass;
            }
            this.$grid.attr({
                class:tableClass
            });
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

        if (className.indexOf('page') >= 0) {
            page = parseInt($el.val(), 10);
        } else if (className.indexOf('prev') >= 0) {
            page = this.currPage - 1;
        } else if (className.indexOf('next') >= 0) {
            page = this.currPage + 1;
        } else if (className.indexOf('first') >= 0) {
            page = 1;
        } else if (className.indexOf('last') >= 0) {
            page = this.cntPages;
        } else {
            page = this.currPage;
        }
        if (page > this.cntPages || page <= 0) {
            return false;
        }
        var $pagerCell = $("div.bbGrid table tfoot td.pager",this.$el);
        if (this.currPage !== page) {
            this.currPage = page;
            $pagerCell.find('a').removeClass('active');
            $pagerCell.find('input').val(this.currPage);

            if (this.currPage > 1) {
                $pagerCell.find('a.prev,.first').removeClass('active');
            }
            if (this.currPage < this.cntPages) {
                $pagerCell.find('a.next,.last').addClass('active');
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
    },
    addHeaderStyles: function() {
        var $style = $("<style>").attr({type:"text/css"}).html(this.defaultHeadStyles);
        if (this.css == 'foundation') $style.append(this.foundationStyles);
        else if (this.css == 'bootstrap') $style.append(this.bootstrapStyles);
        $("head").append($style);
    },
    addDefaultStyles: function() {
        var $style = $("<style>").attr({type:"text/css"}).html(this.defaultTableStyles).append(this.defaultHeadStyles);
        $("head").append($style);
    },
    foundationStyles: '.bbGrid table thead tr { border-bottom: thin solid #ccc; }\
        .bbGrid table tr th, .bbGrid table tr td { padding-left: 1.5rem; padding-right: 1.5rem }\
        .bbGrid table tr th { white-space: nowrap; }\
        .bbGrid table thead > tr > td > div > label.rowlist-label,\
        .bbGrid table thead > tr > td > div > select.rowlist,\
        .bbGrid table thead > tr > td > div > input,\
        .bbGrid table thead > tr > td > input,\
        .bbGrid table thead > tr > td > select  { margin-bottom: 1px; }\
        .bbGrid table thead > tr > td > div > label.rowlist-label { display:inline; }\
        .bbGrid table thead > tr > td > div > select.rowlist { width: auto; }\
        .bbGrid table tfoot { border-top: thin solid #ccc; }\
        .bbGrid table tfoot tr td.pager input.page { display: inline; width: 4rem; text-align: right; margin-bottom:1px; }\
        .bbGrid table tfoot tr td.pager a.button { margin-bottom:1px; }\
        .bbGrid table tfoot tr td.pager a.button:hover { text-decoration:none; }',
    bootstrapStyles: '',
    defaultTableStyles: '.bbGrid table { border: thin solid #ccc; border-collapse: collapse; font-family: sans-serif; }\
        .bbGrid table tbody tr:nth-child(odd) {\
            background-color: #efefef;\
        }\
        .bbGrid table thead tr th, .bbGrid table tbody tr td {\
            padding: .35rem;\
        }\
        .bbGrid table thead { border-bottom: thin solid #ccc;}',
    defaultHeadStyles: '.bbGrid table thead tr th.sortable { cursor: pointer; }\
        .bbGrid table thead tr th.sortable span.arrows { float: left; margin-right: 0.25em; }\
        .bbGrid table thead tr th.sortable span.arrows i { width: 0; height: 0; display: block; }\
        .bbGrid table thead tr th.sortable span.arrows i.up { \
            border-left: .25em solid transparent;\
            border-right: .25em solid transparent;\
            border-bottom: .35em solid;\
            margin-bottom: 1px;\
        } \
        .bbGrid table thead tr th.sortable.sorted.asc span.arrows i.down { \
            border-top-color: transparent;\
        }\
        .bbGrid table thead tr th.sortable span.arrows i.down { \
            border-left: .25em solid transparent;\
            border-right: .25em solid transparent;\
            border-top: .35em solid;\
        } \
        .bbGrid table thead tr th.sortable.sorted.desc span.arrows i.up { \
            border-bottom-color: transparent;\
        }\
        .bbGrid table tfoot tr td.pager a:not(.active) { \
            text-decoration: none; \
            color: #777;\
            cursor: default;\
        }'
});

