bbGrid.TfootView = Backbone.View.extend({
    initialize: function (options) {
        this.view = options.view;
    },
    tagName: 'tfoot',
    render: function () {
        var cols, leftCols;//, rightCols;
        cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
        cols = _.map(cols, function (col) { col.label = col.label || col.property; return col; });
        this.view.colLength = cols.length + (this.view.multiselect ? 1 : 0) + (this.view.subgrid ? 1 : 0);
        //leftCols = Math.ceil( this.view.colLength / 2 );
        //rightCols = this.view.colLength - leftCols;

        if (!this.$footHolder) {
            this.$footHolder = $('<tr/>');
            this.$el.append(this.$footHolder);
        }
        if (!this.view.$pager && this.view.rows) {
            this.view.pager = new bbGrid.PagerView({ view: this.view, colspan: this.view.colLength });
            this.view.$pager = this.view.pager.render();
            this.$footHolder.append(this.view.$pager);
        }
        return this.$el;
    }
});

