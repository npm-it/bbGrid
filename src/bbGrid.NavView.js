bbGrid.NavView = Backbone.View.extend({
    initialize: function (options) {
        this.view = options.view;
        this.css = options.css;
    },
    tagName: 'div',
    render: function () {
        if (this.view.buttons) {
            var self = this, btn, btnHtml, $button;
            var groupClass, btnClass;
            if (self.css) {
                // inject the styles
                switch (self.css) {
                    case 'bootstrap':
                        this.view.$buttonsContainer = $('<div/>', {'class': 'bbGrid-navBar-buttonsContainer btn-group span'});
                        btnWrapper = null;
                        btnClass = 'btn btn-mini';
                        break;
                    case 'foundation':
                        this.view.$buttonsContainer = $('<ul/>', {'class': 'bbGrid-navBar-buttonsContainer button-group'});
                        btnWrapper = '<li/>';
                        btnClass = 'button secondary tiny';
                        break;
                    case 'default':
                        btnClass = '';
                        break;
                }
            }

            this.view.buttons = _.map(this.view.buttons, function (button) {
                if (!button) {
                    return undefined;
                }

                btn = _.template('<button <%if (id) {%>id="<%=id%>"<%}%> class="<%= btnClass %>" type="button"><%=title%></button>', null, bbGrid.templateSettings);
                btnHtml = button.html || btn({id: button.id, title: button.title, btnClass: btnClass});
                $button = $(btnHtml);
                if( btnWrapper ) {
                    $btnWrapper = $(btnWrapper);
                    $button.appendTo($btnWrapper);
                    $btnWrapper.appendTo(self.view.$buttonsContainer);
                } else {
                    $button.appendTo(self.view.$buttonsContainer);
                }
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

