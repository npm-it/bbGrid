bbGrid.FilterView = Backbone.View.extend({
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

