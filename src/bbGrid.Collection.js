/* main collection class - handles all filtering and searching */
bbGrid.Collection = Backbone.Collection.extend({
    initialize: function(models, options) {
        console.log('bbGrid.Collection.initialize()');
/*        if (!_.isEmpty(models)) {
            this.parse(models);
        } */
        console.info(this);

        // Setting this in the extend() object uses the same filter list for
        // all grids on the page. Probably has to do with how Backbone's
        // inheritance and initialization works. Putting it here fixes it.
        this.filters = {};
        this.searchCriteria = [];
    },
    filtered: [],
    fullJson: [],
    refreshCollection: function(e) {
        this.filtered = this.fullJson = this.toJSON();
        console.info(this);
    },
    // filters: {},
    // should not be aware of columns and stuff
    applyFilter: function (key, text, customFilter) {
        if (text == '') delete this.filters[key];
        else this.filters[key] = text;

        this.reset(this.fullJson,{silent:true}); // reset it to start off
        if (!_.isEmpty(this.filters)) {
            // how to reset it each time
            _.each(_.keys(this.filters), function(key) {
                var match = this.filters[key];
                this.filtered = _.filter(this.models, function (model) {
                    if (customFilter) return customFilter(model,match);
                    var val = model.get(key);
                    if (val) {
                        // Since this is driven by the column header why were we downcasing?
                        return ("" + val).indexOf(match) >= 0;
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
                            origVal = model.get(criteria.property);
                            if( _.isUndefined(origVal) ) {
                                matches = false;
                            } else {
                                if( !_.isString(origVal) ) {
                                    origVal = '' + origVal; // convert to string
                                }
                                var val = origVal.toLowerCase().trim();
                                matches = val && ( val.indexOf(this.searchText.toLowerCase().trim(), 0) >= 0 );
                            }
                        }
                    }
                },this);
                return matches;
            },this);
            this.reset(this.filtered,{silent:true});
        }

        this.trigger('reset');
    },
    searchText: '',
    search: function(text) {
        // apply filters to the full list first, then search within
        if (this.searchText != text) {
            this.searchText = text;
            this.applyFilter('bogus','');
        }
    }
});
