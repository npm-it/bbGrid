/*
 * This encapsulates the search field and its events
 */
bbGrid.SearchView = Backbone.View.extend({
    initialize: function (options) {
        this.events = {
            'keyup input[name=search]': 'onSearch',
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
    //tagName: 'tr',
    defaultTemplate: '<input name="search" type="text" placeholder="<%=dict.search%>">',
    bootstrapTemplate: '<input name="search" type="text" placeholder="<%=dict.search%>" class="form-control input-med">',
    foundationTemplate: '<input name="search" type="text" placeholder="<%=dict.search%>">',
    onSearch: function (event) {
        var self = this,
            $el = $(event.target),
            text = $el.val();
        this.view.collection.search(text);
        //this.view.collection.trigger('reset');
    },
    render: function () {
        var searchBarHtml = _.template(this.templateBody,{
            dict: this.view.dict,
        }, bbGrid.templateSettings);
        this.$el.html(searchBarHtml);//.attr({colspan:this.colspan});
        return this.$el;
    }
});

