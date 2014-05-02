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

