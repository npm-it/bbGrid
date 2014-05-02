bbGrid.TheadView = Backbone.View.extend({
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

