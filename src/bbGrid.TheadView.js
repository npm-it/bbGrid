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
        cols = _.filter(this.view.colModel, function (col) {return !col.hidden; });
        cols = _.map(cols, function (col) { col.label = col.label || col.property; return col; });
        this.view.colLength = cols.length + (this.view.multiselect ? 1 : 0) + (this.view.subgrid ? 1 : 0);

        if (!this.$columnHeaders) {
            this.$columnHeaders = $('<tr/>', {'class': 'column-headers'});
            this.$el.append(this.$columnHeaders);
        }
        theadHtml = this.template({
            isMultiselect: this.view.multiselect,
            isContainSubgrid: this.view.subgrid,
            cols: cols,
            sortCol: this.view.sortName,
            sortOrder: this.view.sortOrder
        });
        this.$columnHeaders.html(theadHtml);

        if (!this.view.minimalHeader) {

          if (!this.$searchRow) {
              this.$searchRow = $('<td/>',{colspan:this.view.colLength}); // bootstrap or foundation styling
              this.$el.prepend($('<tr/>').html(this.$searchRow));
          }

          if (!this.view.$rowCountSelector) {
              this.rowCountSelector = new bbGrid.RowCountView({view:this.view});
              this.view.$rowCountSelector = this.rowCountSelector.render();
              switch (this.view.css) {
                  case 'bootstrap':
                      this.view.$rowCountSelector.addClass('pull-left');
                      break;
                  case 'foundation':
                      this.view.$rowCountSelector.addClass('left small-4');
                      break;
                  default:
                      this.view.$rowCountSelector.css({float:'left'});
              }
              this.$searchRow.append(this.view.$rowCountSelector);
          }

          if (!this.view.$searchBar && this.view.enableSearch) {
              this.searchBar = new bbGrid.SearchView({view: this.view});
              this.view.$searchBar = this.searchBar.render();
              switch (this.view.css) {
                  case 'bootstrap':
                      this.view.$searchBar.addClass('pull-right');
                      break;
                  case 'foundation':
                      this.view.$searchBar.addClass('right');
                      break;
                  default:
                      this.view.$searchBar.css({float:'right'});
              }
              this.$searchRow.append(this.view.$searchBar);
          }

        }

        if (!this.view.$filterBar && this.view.enableFilter) {
            if (this.view.autoFetch) { // when fetching the filter values are unknown at render
                this.view.collection.on('reset',this.addFilter);
            } else {
                this.addFilter();
            }
        }
        return this.$el;
    },
    addFilter: function() {
        this.view.filterBar = new bbGrid.FilterView({ view: this.view });
        this.view.$filterBar = this.view.filterBar.render();
        this.$el.append(this.view.$filterBar);
        this.view.collection.off('reset',this.addFilter);

    }
});

