[bbGrid (npmweb)](http://github.com/npmweb/bbGrid)
====================

[bbGrid (original)](http://direct-fuel-injection.github.com/bbGrid/)
====================
An extendable grid system (jqGrid like) developed on Backbone.js

#### Requirements
- Backbone.js > 1.0.0
- jQuery >= v1.8.3

Include bbGrid.js and bbGrid.css into your project. 
[Documentation and examples.](http://direct-fuel-injection.github.com/bbGrid/)

The npm fork has significant customizations, simplifications and new features.

#### Changes
- Removed the bootstrap dependency
- Added a date comparator for easier date sorting
- Changed the search function to use a *startsWith* paradigm instead of matching anywhere within the string
- Changed search to search across all of the specified columns rather than selecting a column to search on
- Enabled searching on columns that have an *render* parameter specified.

#### New Features
- Added a LESS version of the CSS
- Added ability to provide custom search and custom filter functions as callbacks within the column model (see below).
- Added a default sort so that it shows in the grid header which column is currently sorted.

#### New Features
- The key config item is the colModel, which now has many new attributes:
 	- filterOptions: (array of strings) provide a custom list of options for the filter dropdown on the column. 
	- customFilter: callback function with signature (model, value) which should return true if the model attribute for the column matches the value
	- sorttype: 
		- added 'date' as a valid type (the value of that attribute must be formatted so that it can be parsed into a JS Date object)
		- sorttype can now be a callback function to provide for custom sorting. If the attribute isn't a string, number, or date, this can be used in conjunction with the actions parameter to provide the ability to sort on the column.
	- searchable: (default = true) if false, search will ignore that column
	- sortOrder: if specified the collection will be initially sorted on that column and in the order specified ('asc' or 'desc')


#### Disclaimer
- I have *not* verified that the changes in this version didn't break some of the other features, like the sub-grid.


