bbGrid.FilterView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'keyup input[name=filter]': 'onFilter',
            'change select[name=filter]': 'onFilter'
        };
        this.view = options.view;
        options.view.filterOptions = {};
        this.rendered = false;
        if (this.view.css) {
            switch(this.view.css) {
                case 'bootstrap': 
                    this.templateBody  = this.bootstrapTemplate;
                    break;
                case 'foundation': 
                    this.templateBody  = this.foundationTemplate;
                    break;
                default:
                    this.templateBody  = this.defaultTemplate;
            }
        } else {
            this.templateBody  = this.defaultTemplate;
        }

    },
    tagName: 'tr',
    defaultTemplate: '<% if (isMultiselect) {%>\
            <td></td>\
        <%} if (isContainSubgrid) {%>\
            <td></td>\
        <% } %>\
        <% _.each(cols, function (col) {%>\
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
        <%})%>', 
    bootstrapTemplate: '<% if (isMultiselect) {%>\
            <td></td>\
        <%} if (isContainSubgrid) {%>\
            <td></td>\
        <% } %>\
        <% _.each(cols, function (col) {%>\
            <td>\
                <%if (col.filter) {%>\
                    <<% if (col.filterType === "input") \
                        {%>input<%}else{%>select<%\
                        }%> class="form-control input-sm <%if (col.filterProperty) {%><%=col.filterProperty%><%}else{%><%=col.property %><%}%>" \
                        name="filter" type="text" value="<%=filterOptions[col.property]%>">\
                <% if (col.filterType !== "input") {%>\
                <option value=""><%=dict.all%></option>\
                    <% _.each(options[col.property], function (option) {%>\
                        <option value="<%=option%>"<% if (filterOptions[col.property] == option) print(\' selected\'); %>><%=option%></option>\
                    <%})%>\
                </select><%}%>\
                <%}%>\
            </td>\
        <%})%>', 
    foundationTemplate: '<% if (isMultiselect) {%>\
            <td></td>\
        <%} if (isContainSubgrid) {%>\
            <td></td>\
        <% } %>\
        <% _.each(cols, function (col) {%>\
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
        <%})%>', 
    
    onFilter: function (e) {
        var $f = $(e.currentTarget);
        var key = $f.attr('class');
        if (this.view.css == 'bootstrap') key = key.replace("form-control input-sm","").trim();
        var text = $.trim($f.val());
        var filterCol = _.findWhere(this.view.colModel,{filterProperty:key});
        if (filterCol && filterCol.customFilter) 
            this.view.collection.applyFilter(key,text,filterCol.customFilter);
        else 
            this.view.collection.applyFilter(key,text);

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
                if (col.filterOptions) {
                    options[col.property] = col.filterOptions;
                } else { 
                    var list = _.uniq(self.view.collection.pluck(col.filterProperty || col.property));
                    list.sort();
                    options[col.property] = list;
                }
            }
        });
        filterBarHtml = _.template(this.templateBody,{
            dict: this.view.dict,
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            filterOptions: this.view.filterOptions,
            cols: _.filter(this.view.colModel, function (col) {return !col.hidden; }),
            options: options
        }, bbGrid.templateSettings);
        this.$el.html(filterBarHtml);
        this.rendered = true;
        return this.$el;
    }
});    

