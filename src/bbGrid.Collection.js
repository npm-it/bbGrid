/* main collection class - handles all filtering and searching */
bbGrid.Collection = Backbone.Collection.extend({
    initialize: function(models, options) {
        console.log('** bbGrid.Collection.initialize() **');
    },
    filtered: [],
    fullJson: [],
    refreshCollection: function(e) {
        console.log('** bbGrid.Collection.refreshCollection() **');
        this.filtered = this.fullJson = this.toJSON();
        console.info(this);
    },
    filters: {},
    // should not be aware of columns and stuff
    filter: function (key, text, customFilter) {
        if (text == '') delete this.filters[key];
        else this.filters[key] = text;

        this.reset(this.fullJson,{silent:true}); // reset it to start off
        if (!_.isEmpty(this.filters)) {
            console.log('going to filter on these');
            console.info(this.filters);
            // how to reset it each time
            _.each(_.keys(this.filters), function(key) {
                var match = this.filters[key];
                this.filtered = _.filter(this.models, function (model) {
                    if (customFilter) return customFilter(model,match);
                    var val = model.get(key);
                    if (val) {
                        return ("" + val).toLowerCase().indexOf(match.toLowerCase()) >= 0;
                    } else {
                        return false;
                    }
                });
                this.reset(this.filtered,{silent:true});
            },this);

        }

        if (this.searchText != '') {
            this.filtered = _.filter(this.models, function (model) {
                var matches = false;
                var log = '** searching model '+model.get('nameFirst')+' ' +model.get('nameLast')+' for '+this.searchText;
                _.each(this.searchCriteria, function (criteria) {
                    if (matches === false) {
                        if (criteria.search !== false) {
                            matches = criteria.search(model,this.searchText);
                        } else { // default search
                            var val = model.get(criteria.property).toLowerCase().trim();
                            matches = val && ( val.lastIndexOf(this.searchText.toLowerCase().trim(), 0) === 0 );
                        }
                    }
                },this);
                console.log(log+' :: Did it match? '+matches);
                return matches;
            },this);
            this.reset(this.filtered,{silent:true});
        }

        this.trigger('reset');
    },
    searchText: '',
    searchCriteria: [],
    search: function(text) {
        // apply filters to the full list first, then search within
        if (this.searchText != text) {
            this.searchText = text;
            this.filter('bogus','');
        }
    }
});
