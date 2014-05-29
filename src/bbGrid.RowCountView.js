/*
 * This encapsulates the search field and its events
 */
bbGrid.RowCountView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'change .rowlist': 'onRowsChanged',
        };
        this.view = options.view;
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
    defaultTemplate: '<% if (rowlist) {%>\
        <span class="rowlist-label"><%=dict.rowsOnPage%>:</span>\
        <select class="rowlist">\
            <% _.each(rowlist, function (val) {%>\
                <option <% if (rows === val) {%>selected="selected"<%}%>><%=val%></option>\
            <%})%>\
        </select>\
        <%}%>',
    bootstrapTemplate: '<% if (rowlist) {%>\
        <select class="rowlist form-control input-sm" style="display:inline;">\
            <% _.each(rowlist, function (val) {%>\
                <option <% if (rows === val) {%>selected="selected"<%}%>><%=val%></option>\
            <%})%>\
        </select>\
        <%}%>',
    foundationTemplate: '<% if (rowlist) {%>\
            <label class="rowlist-label"><%=dict.rowsOnPage%>:</label>\
            <select class="rowlist">\
            <% _.each(rowlist, function (val) {%>\
                <option <% if (rows === val) {%>selected="selected"<%}%>><%=val%></option>\
            <%})%>\
            </select>\
        <%}%>',
    foundationTemplateX: '<% if (rowlist) {%>\
        <div class="row"><div class="small-3 columns">\
            <label class="rowlist-label right inline"><%=dict.rowsOnPage%>:</label>\
        </div><div class="small-9 columns">\
        <select class="rowlist">\
            <% _.each(rowlist, function (val) {%>\
                <option <% if (rows === val) {%>selected="selected"<%}%>><%=val%></option>\
            <%})%>\
        </select></div></div>\
        <%}%>',
    onRowsChanged: function (event) {
        this.view.rows = parseInt($(event.target).val(), 10);
        this.render();
        this.view.render();
    },
    render: function () {
        var rowCountHtml = _.template(this.templateBody,{
            dict: this.view.dict,
            rows: this.view.rows,
            rowlist: this.view.rowList || false,
        });
        this.$el.html(rowCountHtml);//.attr({colspan:this.colspan});
        return this.$el;
    }
});

