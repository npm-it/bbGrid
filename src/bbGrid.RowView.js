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

        // this requires Intl.DateFormat & NumberFormat, 
        // so load the shim if the browser doesn't support it

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
        var formatter = new (Intl || IntlPolyfill).NumberFormat('en-US',_.extend({
          minimumFractionDigits: 2,
          style: 'decimal'
        },options));
        return formatter.format(options.value);
    },
    defaultDateFormat: {
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit",
        hour12: false
    },
    date: function(options) {
        var format = _.has(options,'format') ? options.format : this.defaultDateFormat;
        var dt = _.isString(options.value) ? new Date(options.value) : options.value; 
        var formatter = new (Intl || IntlPolyfill).DateTimeFormat(bbGrid.locale,format);
        return formatter.format(dt);
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
