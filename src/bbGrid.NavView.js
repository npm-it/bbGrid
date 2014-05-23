bbGrid.NavView = Backbone.View.extend({
    initialize: function (options) {
        this.view = options.view;
    },
    tagName: 'div',
    render: function () {
        if (this.view.buttons) {
            var self = this, btn, btnHtml, $button;
            this.view.$buttonsContainer = $('<div/>', {'class': 'bbGrid-navBar-buttonsContainer btn-group span'});
            this.view.buttons = _.map(this.view.buttons, function (button) {
                if (!button) {
                    return undefined;
                }
                btn = _.template('<button <%if (id) {%>id="<%=id%>"<%}%> class="btn btn-mini" type="button"><%=title%></button>', null, bbGrid.templateSettings);
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

