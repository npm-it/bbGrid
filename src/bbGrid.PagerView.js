bbGrid.PagerView = Backbone.View.extend({

    initialize: function (options) {
        this.events = {
            'click a.active': 'onPageChanged',
            'click a:not(.active)': 'noOp',
            'change .page': 'onPageChanged'
        };
        this.view = options.view;
        this.colspan = options.colspan;
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
    tagName: 'td',
    className: 'pager',
    defaultTemplate: 
        '<div>\
            <a href="#" class="first<%if (page > 1) {%> active<%}%>">&lt;&lt;</a>&nbsp;\
            <a href="#" class="prev<%if (page > 1) {%> active<%}%>">&lt;</a>&nbsp;\
            <input class="page" value="<%=page%>" type="number" size="<%=inputMaxDigits%>" min="1" max="<%= cntpages %>" maxlength="<%=inputMaxDigits%>"> / \
            <span class="total"> <%=cntpages%> </span>&nbsp;\
            <a href="#" class="next<%if (page < cntpages) {%> active<%}%>">&gt;</a>&nbsp;\
            <a href="#" class="last<%if (page < cntpages) {%> active<%}%>">&gt;&gt;</a>&nbsp;\
        </div>',
    bootstrapTemplate: 
        '<div>\
            <a href="#" class="first btn btn-sm btn-default<%if (page > 1) {%> active<%}%>">&lt;&lt;</a>&nbsp;\
            <a href="#" class="prev btn btn-sm btn-default<%if (page > 1) {%> active<%}%>">&lt;</a>&nbsp;\
            <input class="page input-sm" value="<%=page%>" type="number" size="<%=inputMaxDigits%>" min="1" max="<%= cntpages %>" maxlength="<%=inputMaxDigits%>" style="text-align:right;width:5em;"> / \
            <span class="total"> <%=cntpages%> </span>&nbsp;\
            <a href="#" class="next btn btn-sm btn-default<%if (page < cntpages) {%> active<%}%>">&gt;</a>&nbsp;\
            <a href="#" class="last btn btn-sm btn-default<%if (page < cntpages) {%> active<%}%>">&gt;&gt;</a>&nbsp;\
        </div>',
    foundationTemplate: 
        '<div>\
            <a href="#" class="first<%if (page > 1) {%> active<%}%> button tiny">&lt;&lt;</a>&nbsp;\
            <a href="#" class="prev<%if (page > 1) {%> active<%}%> button tiny">&lt;</a>&nbsp;\
            <input class="page" value="<%=page%>" type="number" size="<%=inputMaxDigits%>" min="1" max="<%= cntpages %>" maxlength="<%=inputMaxDigits%>"> / \
            <span class="total"> <%=cntpages%> </span>&nbsp;\
            <a href="#" class="next<%if (page < cntpages) {%> active<%}%> button tiny">&gt;</a>&nbsp;\
            <a href="#" class="last<%if (page < cntpages) {%> active<%}%> button tiny">&gt;&gt;</a>&nbsp;\
        </div>',
    noOp: function(e) {
        e.preventDefault();   
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
        pagerHtml = _.template(this.templateBody,{
                dict: this.view.dict,
                page: this.view.currPage,
                cntpages: this.view.cntPages,
                inputMaxDigits: inputMaxDigits
            },bbGrid.templateSettings);
        this.$el.html(pagerHtml).attr({colspan:this.colspan});
    },
    render: function () {
        this.initPager();
        return this.$el;
    }
});

