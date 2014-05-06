bbGrid.PagerView = Backbone.View.extend({

    initialize: function (options) {
        this.events = {
            'click a': 'onPageChanged',
            'change .pager .rowlist': 'onRowsChanged',
            'change .pager .page': 'onPageChanged'
        };
        this.view = options.view;
        this.colspan = options.colspan;
    },
    tagName: 'td',
    className: 'pager',
    template: _.template(
        '<div>\
            <a class="first<%if (page > 1) {%> active<%}%>">&lt;&lt;</a>&nbsp;\
            <a class="prev<%if (page > 1) {%> active<%}%>">&lt;</a>&nbsp;\
            <input class="input" value="<%=page%>" type="number" size="<%=inputMaxDigits%>" min="1" max="<%= cntpages %>" maxlength="<%=inputMaxDigits%>"> / \
            <span class="total"> <%=cntpages%> </span>&nbsp;\
            <a class="next<%if (page < cntpages) {%> active<%}%>">&gt;</a>&nbsp;\
            <a class="last<%if (page < cntpages) {%> active<%}%>">&gt;&gt;</a>&nbsp;\
        <% if (rowlist) {%>\
        <span class="rowlist-label"><%=dict.rowsOnPage%>:</span>\
        <select class="rowlist">\
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
        var inputMaxDigits = ('' + this.view.cntPages).length;
        pagerHtml = this.template({
                dict: this.view.dict,
                page: this.view.currPage,
                cntpages: this.view.cntPages,
                rows: this.view.rows,
                rowlist: this.view.rowList || false,
                inputMaxDigits: inputMaxDigits
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

