/*
 * This encapsulates the search field and its events
 */
bbGrid.SearchView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'keyup input[name=search]': 'onSearch',
        };
        this.grid = options.view;
        this.colspan = options.colspan;
    },
    tagName: 'td',
    template: _.template(
        '<input name="search" type="text" placeholder="<%=dict.search%>">', null, bbGrid.templateSettings
    ),
    onSearch: function (event) {
        var self = this,
            $el = $(event.target),
            text = $el.val();
        console.log('search on "'+text+'"');
        this.grid.collection.search(text);
        //this.view.collection.trigger('reset');
    },
    render: function () {
        var searchBarHtml = this.template({
            dict: this.grid.dict,
        });
        this.$el.html(searchBarHtml).attr({colspan:this.colspan});
        return this.$el;
    }
});

