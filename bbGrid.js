//     bbGrid.js 2.0.0

//     (c) 2012-2013 Minin Alexey, direct-fuel-injection.
//     bbGrid may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://direct-fuel-injection.github.com/bbGrid/
//
//     Customizations by Russell Todd (North Point Ministries)
//     https://github.com/npmweb/bbGrid
(function () {
    var templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    },
    viewOptions,
        bbGrid = this.bbGrid = {
            'VERSION': '2.0.0',
            'lang': 'en',
            'setDict': function (lang) {
                if (bbGrid.Dict.hasOwnProperty(lang)) {
                    this.lang = lang;
                }
            }
        };

    bbGrid.Dict = {
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
    };


    /* main view - this is the object that gets instantiated */
    bbGrid.View = Backbone.View.extend({

        viewOptions: ['autofetch', 'buttons', 'colModel', 'container',
            'enableSearch', 'multiselect', 'rows', 'rowList', 'selectedRows',
            'subgrid', 'subgridAccordion', 'onRowClick', 'onRowDblClick', 'onReady',
            'onBeforeRender', 'onRowExpanded', 'onRowCollapsed', 'events'],
        initialize: function(options) {
            options || (options = {});
            _.extend(this, _.pick(options, _.union(this.viewOptions, _.values(options.events))));
            console.info(this);
            //Backbone.View.apply(this, [options]);
            this.setDict(bbGrid.lang);
            this.on('all', this.EventHandler, this);
            this.rowViews = {};
            this.selectedRows = [];
            this.currPage = 1;
            if (!this.collection) {
                throw new Error('A "collection" property must be specified');
            }
            this.collection.on("all", this.collectionEventHandler, this);
            this.enableFilter = _.compact(_.pluck(this.colModel, 'filter')).length > 0;
            this.autofetch = !this.loadDynamic && this.autofetch;

            _.each(this.colModel,function(col) {
                col.sortable = _.has(col,'sortable') ? col.sortable : true;
            });
            
            var initSortCol = _.find(this.colModel, function(col) { return col.defaultSort; } );
            if (initSortCol) {
                this.rsortBy(initSortCol);
            }
            this.render();
            if (this.autofetch) {
                this.collection.fetch();
                this.autofetch = false;
            }
            if (this.loadDynamic) {
                _.extend(this.collection.prototype, {
                    parse: function (response) {
                        this.view.cntPages = response.total;
                        return response.rows;
                    }
                });
            }
            if (this.enableSearch) { // default the searchable value to true
                _.each(this.colModel,function(col) {
                    if (col.searchable !== false) col.searchable = true;
                })
                this.searchColumns = _.where(this.colModel, {searchable: true});
            }
            
        },
        lang: bbGrid.lang,
        tagName: 'div',
        className: 'bbGrid-container',
        setDict: function (lang) {
            if (bbGrid.Dict.hasOwnProperty(lang)) {
                this.lang = lang;
            }
            this.dict = bbGrid.Dict[this.lang];
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
        collectionEventHandler: function (eventName, model, collection, options) {
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
            if (!this.autofetch) {
                this.renderPage();
            }
            return this;
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
                sortType = col.sortType || 'string';
                this.sortOrder = 'asc'; // starting a new col so just do asc
                switch (sortType) {
                    case 'number':
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
            if (collection.length === 0 && !this.autofetch) {
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
            subgridRow = _.template('<tr class="bbGrid-subgrid-row"><td colspan="<%=extra%>"/><td colspan="<%=colspan %>"></td></tr>', null, templateSettings);
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
            if (this.loadDynamic && !this.autofetch && !options.silent) {
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
            if (!this.autofetch && this.collection.length > 0) {
                this.toggleLoading(false);
            }
            if (this.onReady && !this.autofetch) {
                this.onReady();
            }
            if (this.filterBar && !options.silent) {
                this.filterBar.render();
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

    bbGrid.RowView = Backbone.View.extend({
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
        className: 'bbGrid-row',
        template: _.template(
            '<% if (isMultiselect) {%>\
            <td class="bbGrid-multiselect-control"><input type="checkbox" <% if (isDisabled) { %>disabled="disabled"<% } %><% if (isChecked) {%>checked="checked"<%}%>></td>\
            <%} if (isContainSubgrid) {%>\
                <td class="bbGrid-subgrid-control">\
                    <i id="<%= (isSelected) ? "icon-minus" : "icon-plus" %>">\
                </td>\
            <%} _.each(values, function (row) {%>\
                <td <% if (row.hasActions) {%>class="bbGrid-actions-cell"<%}%><% if (_.has(row,"align")) print(row.align); %>>\
                    <%=row.value%>\
                </td>\
            <%})%>', null, templateSettings
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
                values: _.map(cols, function (col) {
                    col.align='';
                    if (col.render) {
                        col.hasActions = true; //'bbGrid-actions-cell';
                        col.value = col.render(self.model, self.view);
                    } else {
                        col.hasActions = false;
                        col.value = self.model.get(col.property);
                        // provide some custom formatters for common types
                        if (_.has(col,'type')) {
                            switch(col.type) {
                                case 'boolean':
                                    col.value = ( col.value === 1 || 
                                                ( _.isString(col.value) && (col.value.toLowerCase() === 'true' || col.value === '1') ) || 
                                                col.value === true ) ? "True" : "False";
                                    break;
                                case 'currency': // add currency options
                                    col.value = self.currency(col);
                                    col.align = ' align="right"';
                                    break;
                                case 'number': // add number options
                                case 'decimal': // add number options
                                    col.value = self.number(col);
                                    col.align = ' align="right"';
                                    break;
                                case 'integer': 
                                    col.minimumFractionDigits = 0;
                                    col.value = self.number(col);
                                    col.align = ' align="right"';
                                    break;                                
                                case 'percent': 
                                    col.style = 'percent';
                                    col.value = self.number(col);
                                    col.align = ' align="right"';
                                    break;                                
                                case 'email': // add mailto options??
                                    col.value = '<a href="mailto:'+col.value+'">'+col.value+'</a>';
                                    break;
                                case 'url': // add target options and check for http??
                                    col.value = '<a href="'+col.value+'">'+col.value+'</a>';
                                    break;
                                case 'date':
                                    col.value = self.date(col);
                                    break;
                                case 'time':
                                    col.value = self.date(col);
                                    break;
                                default:
                            }

                        }
                    }
                    return col;
                })
            });
            if (isChecked) {
                this.selected = true;
                this.$el.addClass('warning');
            }
            if (_.has(self.model,'id')) this.$el.attr({id:"tr-"+self.model.id});
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
            if (this.view.onReady && !this.view.autofetch) {
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

    bbGrid.TheadView = Backbone.View.extend({
        initialize: function (options) {
            this.events = {
                'click th.sortable': 'onSort',
                'click input[type=checkbox]': 'onAllCheckbox'
            };
            this.view = options.view;
        },
        tagName: 'thead',
        className: 'bbGrid-grid-head',
        oldIconAfterLabel: '<i <% \
                        if (col.sortOrder === "asc" ) {%>class="icon-chevron-up"<%} else \
                            if (col.sortOrder === "desc" ) {%>class="icon-chevron-down"<% } %>/>',
        template: _.template(
            '<% if (isMultiselect) {%><th style="width:15px"><input type="checkbox"></th><%}\
                if(isContainSubgrid) {%><th style="width:15px"/><%}\
                _.each(cols, function (col) {%>\
                    <th <%if (col.width) {%>style="width:<%=col.width%>"<%}%> class="th-<%=col.property%><%if (col.sortable !== false) {%> sortable<%} if (sortCol == col.property) {%> sorted <%= sortOrder %><%}%>"><span class="arrows"><i class="up"/><i class="down"/></span><%=col.label%></th>\
            <%})%>', null, templateSettings
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

    bbGrid.FilterView = Backbone.View.extend({
        initialize: function (options) {
            this.events = {
                'keyup input[name=filter]': 'onFilter',
                'change select[name=filter]': 'onFilter'
            };
            this.view = options.view;
            options.view._collection = options.view.collection;
            options.view.filterOptions = {};
        },
        tagName: 'tr',
        className: 'bbGrid-filter-bar',
        template: _.template(
            '<% if (isMultiselect) {%>\
                <td></td>\
            <%} if (isContainSubgrid) {%>\
                <td></td>\
            <% } %>\
            <%_.each(cols, function (col) {%>\
                <td>\
                    <%if (col.filter) {%>\
                        <<% if (col.filterType === "input") \
                            {%>input<%}else{%>select<%\
                            }%> class="<%if (col.filterProperty) {%><%=col.filterProperty%><%}else{%><%=col.property %><%}%>" \
                            name="filter" type="text" value="<%=filterOptions[col.property]%>">\
                    <% if (col.filterType !== "input") {%>\
                    <option value=""><%=dict.all%></option>\
                        <% _.each(options[col.property], function (option) {%>\
                            <option value="<%=option%>"><%=option%></option>\
                        <%})%>\
                    </select><%}%>\
                    <%}%>\
                </td>\
            <%})%>', null, templateSettings),
        onFilter: function () {
            var text, self = this,
                collection = new Backbone.Collection(this.view._collection.models);
            this.view.tfoot.searchBar.render();
            this.view.setCollection(collection);
            _.each($('*[name=filter]', this.$el), function (el) {
                text = $.trim($(el).val());
                self.view.filterOptions[el.className] = text;
            });
            if (_.keys(this.view.filterOptions).length) {
                self.filter(collection, _.clone(this.view.filterOptions));
            }
            this.view.trigger('filter');
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
                console.log('hiya');
                filterCol = _.findWhere(this.view.colModel,{filterProperty:key});
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
            this.filter(collection, options);
        },
        render: function () {
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
            return this.$el;
        }
    });    

    bbGrid.NavView = Backbone.View.extend({
        initialize: function (options) {
            this.view = options.view;
        },
        tagName: 'div',
        className: 'bbGrid-grid-nav row',
        render: function () {
            if (this.view.buttons) {
                var self = this, btn, btnHtml, $button;
                this.view.$buttonsContainer = $('<div/>', {'class': 'bbGrid-navBar-buttonsContainer btn-group span'});
                this.view.buttons = _.map(this.view.buttons, function (button) {
                    if (!button) {
                        return undefined;
                    }
                    btn = _.template('<button <%if (id) {%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>', null, templateSettings);
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

    bbGrid.TfootView = Backbone.View.extend({
        initialize: function (options) {
            this.view = options.view;
        },
        tagName: 'tfoot',
        className: 'bbGrid-grid-foot',
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

    bbGrid.PagerView = Backbone.View.extend({

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
        className: 'bbGrid-pager-container',
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
            ', null, templateSettings

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

    bbGrid.SearchView = Backbone.View.extend({
        initialize: function (options) {
            console.log('** SearchView.init() **');
            this.events = {
                'keyup input[name=search]': 'onSearch',
            };
            this.view = options.view;
            this.colspan = options.colspan;
            options.view._collection = options.view.collection;
        },
        tagName: 'td',
        className: 'bbGrid-search-bar',
        template: _.template(
            '<input name="search" type="text" placeholder="<%=dict.search%>">', null, templateSettings
        ),
        onSearch: function (event) {
            var self = this,
                $el = $(event.target),
                text = $el.val(),
                pattern = new RegExp(text, "gi"),
                val, 
                matches,
                searchCols;
            this.view.collection = this.view._collection;
            searchCols = this.view.searchColumns;
            _.each(searchCols,function(col) {
                col.search = col.customSearch || function(model,match) {
                    val = model.get(col.property).toLowerCase();
                    if (!val) return false;
                    return ( val.lastIndexOf(match.toLowerCase(), 0) === 0 );                                   
                };
            });
            if (text) {
                this.view.setCollection(new this.view._collection.constructor(
                    this.view.collection.filter(function (model) {
                        matches = false;
                        _.each(searchCols, function (col) {
                            if (matches === false) {
                                matches = col.search(model,text);
                            }
                        });
                        return matches;
                    })
                ));
            }
            this.view.collection.trigger('reset');
        },
        render: function () {
            var searchBarHtml = this.template({
                dict: this.view.dict,
            });
            this.$el.html(searchBarHtml).attr({colspan:this.colspan});
            return this.$el;
        }
    });




}).call(this);

function date(format, timestamp) {
      //  discuss at: http://phpjs.org/functions/date/
      // original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
      // original by: gettimeofday
      //    parts by: Peter-Paul Koch (http://www.quirksmode.org/js/beat.html)
      // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // improved by: MeEtc (http://yass.meetcweb.com)
      // improved by: Brad Touesnard
      // improved by: Tim Wiel
      // improved by: Bryan Elliott
      // improved by: David Randall
      // improved by: Theriault
      // improved by: Theriault
      // improved by: Brett Zamir (http://brett-zamir.me)
      // improved by: Theriault
      // improved by: Thomas Beaucourt (http://www.webapp.fr)
      // improved by: JT
      // improved by: Theriault
      // improved by: RafaÅ‚ Kukawski (http://blog.kukawski.pl)
      // improved by: Theriault
      //    input by: Brett Zamir (http://brett-zamir.me)
      //    input by: majak
      //    input by: Alex
      //    input by: Martin
      //    input by: Alex Wilson
      //    input by: Haravikk
      // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // bugfixed by: majak
      // bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // bugfixed by: Brett Zamir (http://brett-zamir.me)
      // bugfixed by: omid (http://phpjs.org/functions/380:380#comment_137122)
      // bugfixed by: Chris (http://www.devotis.nl/)
      //        note: Uses global: php_js to store the default timezone
      //        note: Although the function potentially allows timezone info (see notes), it currently does not set
      //        note: per a timezone specified by date_default_timezone_set(). Implementers might use
      //        note: this.php_js.currentTimezoneOffset and this.php_js.currentTimezoneDST set by that function
      //        note: in order to adjust the dates in this function (or our other date functions!) accordingly
      //   example 1: date('H:m:s \\m \\i\\s \\m\\o\\n\\t\\h', 1062402400);
      //   returns 1: '09:09:40 m is month'
      //   example 2: date('F j, Y, g:i a', 1062462400);
      //   returns 2: 'September 2, 2003, 2:26 am'
      //   example 3: date('Y W o', 1062462400);
      //   returns 3: '2003 36 2003'
      //   example 4: x = date('Y m d', (new Date()).getTime()/1000);
      //   example 4: (x+'').length == 10 // 2009 01 09
      //   returns 4: true
      //   example 5: date('W', 1104534000);
      //   returns 5: '53'
      //   example 6: date('B t', 1104534000);
      //   returns 6: '999 31'
      //   example 7: date('W U', 1293750000.82); // 2010-12-31
      //   returns 7: '52 1293750000'
      //   example 8: date('W', 1293836400); // 2011-01-01
      //   returns 8: '52'
      //   example 9: date('W Y-m-d', 1293974054); // 2011-01-02
      //   returns 9: '52 2011-01-02'

      var that = this;
      var jsdate, f;
      // Keep this here (works, but for code commented-out below for file size reasons)
      // var tal= [];
      var txt_words = [
        'Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur',
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      // trailing backslash -> (dropped)
      // a backslash followed by any character (including backslash) -> the character
      // empty string -> empty string
      var formatChr = /\\?(.?)/gi;
      var formatChrCb = function (t, s) {
        return f[t] ? f[t]() : s;
      };
      var _pad = function (n, c) {
        n = String(n);
        while (n.length < c) {
          n = '0' + n;
        }
        return n;
      };
      f = {
        // Day
        d: function () {
          // Day of month w/leading 0; 01..31
          return _pad(f.j(), 2);
        },
        D: function () {
          // Shorthand day name; Mon...Sun
          return f.l()
            .slice(0, 3);
        },
        j: function () {
          // Day of month; 1..31
          return jsdate.getDate();
        },
        l: function () {
          // Full day name; Monday...Sunday
          return txt_words[f.w()] + 'day';
        },
        N: function () {
          // ISO-8601 day of week; 1[Mon]..7[Sun]
          return f.w() || 7;
        },
        S: function () {
          // Ordinal suffix for day of month; st, nd, rd, th
          var j = f.j();
          var i = j % 10;
          if (i <= 3 && parseInt((j % 100) / 10, 10) == 1) {
            i = 0;
          }
          return ['st', 'nd', 'rd'][i - 1] || 'th';
        },
        w: function () {
          // Day of week; 0[Sun]..6[Sat]
          return jsdate.getDay();
        },
        z: function () {
          // Day of year; 0..365
          var a = new Date(f.Y(), f.n() - 1, f.j());
          var b = new Date(f.Y(), 0, 1);
          return Math.round((a - b) / 864e5);
        },

        // Week
        W: function () {
          // ISO-8601 week number
          var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3);
          var b = new Date(a.getFullYear(), 0, 4);
          return _pad(1 + Math.round((a - b) / 864e5 / 7), 2);
        },

        // Month
        F: function () {
          // Full month name; January...December
          return txt_words[6 + f.n()];
        },
        m: function () {
          // Month w/leading 0; 01...12
          return _pad(f.n(), 2);
        },
        M: function () {
          // Shorthand month name; Jan...Dec
          var theMonth = f.F();
          return theMonth.slice(0,3);
/*          return f.F()
            .slice(0, 3); 
*/
        },
        n: function () {
          // Month; 1...12
          return jsdate.getMonth() + 1;
        },
        t: function () {
          // Days in month; 28...31
          return (new Date(f.Y(), f.n(), 0))
            .getDate();
        },

        // Year
        L: function () {
          // Is leap year?; 0 or 1
          var j = f.Y();
          return j % 4 === 0 & j % 100 !== 0 | j % 400 === 0;
        },
        o: function () {
          // ISO-8601 year
          var n = f.n();
          var W = f.W();
          var Y = f.Y();
          return Y + (n === 12 && W < 9 ? 1 : n === 1 && W > 9 ? -1 : 0);
        },
        Y: function () {
          // Full year; e.g. 1980...2010
          return jsdate.getFullYear();
        },
        y: function () {
          // Last two digits of year; 00...99
          return f.Y()
            .toString()
            .slice(-2);
        },

        // Time
        a: function () {
          // am or pm
          return jsdate.getHours() > 11 ? 'pm' : 'am';
        },
        A: function () {
          // AM or PM
          return f.a()
            .toUpperCase();
        },
        B: function () {
          // Swatch Internet time; 000..999
          var H = jsdate.getUTCHours() * 36e2;
          // Hours
          var i = jsdate.getUTCMinutes() * 60;
          // Minutes
          // Seconds
          var s = jsdate.getUTCSeconds();
          return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
        },
        g: function () {
          // 12-Hours; 1..12
          return f.G() % 12 || 12;
        },
        G: function () {
          // 24-Hours; 0..23
          return jsdate.getHours();
        },
        h: function () {
          // 12-Hours w/leading 0; 01..12
          return _pad(f.g(), 2);
        },
        H: function () {
          // 24-Hours w/leading 0; 00..23
          return _pad(f.G(), 2);
        },
        i: function () {
          // Minutes w/leading 0; 00..59
          return _pad(jsdate.getMinutes(), 2);
        },
        s: function () {
          // Seconds w/leading 0; 00..59
          return _pad(jsdate.getSeconds(), 2);
        },
        u: function () {
          // Microseconds; 000000-999000
          return _pad(jsdate.getMilliseconds() * 1000, 6);
        },

        // Timezone
        e: function () {
          // Timezone identifier; e.g. Atlantic/Azores, ...
          // The following works, but requires inclusion of the very large
          // timezone_abbreviations_list() function.
          /*              return that.date_default_timezone_get();
           */
          throw 'Not supported (see source code of date() for timezone on how to add support)';
        },
        I: function () {
          // DST observed?; 0 or 1
          // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
          // If they are not equal, then DST is observed.
          var a = new Date(f.Y(), 0);
          // Jan 1
          var c = Date.UTC(f.Y(), 0);
          // Jan 1 UTC
          var b = new Date(f.Y(), 6);
          // Jul 1
          // Jul 1 UTC
          var d = Date.UTC(f.Y(), 6);
          return ((a - c) !== (b - d)) ? 1 : 0;
        },
        O: function () {
          // Difference to GMT in hour format; e.g. +0200
          var tzo = jsdate.getTimezoneOffset();
          var a = Math.abs(tzo);
          return (tzo > 0 ? '-' : '+') + _pad(Math.floor(a / 60) * 100 + a % 60, 4);
        },
        P: function () {
          // Difference to GMT w/colon; e.g. +02:00
          var O = f.O();
          return (O.substr(0, 3) + ':' + O.substr(3, 2));
        },
        T: function () {
          // Timezone abbreviation; e.g. EST, MDT, ...
          // The following works, but requires inclusion of the very
          // large timezone_abbreviations_list() function.
          /*              var abbr, i, os, _default;
          if (!tal.length) {
            tal = that.timezone_abbreviations_list();
          }
          if (that.php_js && that.php_js.default_timezone) {
            _default = that.php_js.default_timezone;
            for (abbr in tal) {
              for (i = 0; i < tal[abbr].length; i++) {
                if (tal[abbr][i].timezone_id === _default) {
                  return abbr.toUpperCase();
                }
              }
            }
          }
          for (abbr in tal) {
            for (i = 0; i < tal[abbr].length; i++) {
              os = -jsdate.getTimezoneOffset() * 60;
              if (tal[abbr][i].offset === os) {
                return abbr.toUpperCase();
              }
            }
          }
          */
          return 'UTC';
        },
        Z: function () {
          // Timezone offset in seconds (-43200...50400)
          return -jsdate.getTimezoneOffset() * 60;
        },

        // Full Date/Time
        c: function () {
          // ISO-8601 date.
          return 'Y-m-d\\TH:i:sP'.replace(formatChr, formatChrCb);
        },
        r: function () {
          // RFC 2822
          return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
        },
        U: function () {
          // Seconds since UNIX epoch
          return jsdate / 1000 | 0;
        }
      };
      this.date = function (format, timestamp) {
        that = this;
        jsdate = (timestamp === undefined ? new Date() : // Not provided
          (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
          new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
        );
        return format.replace(formatChr, formatChrCb);
      };
      return this.date(format, timestamp);
}
