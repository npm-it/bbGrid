module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['src/bbGrid.js',
        	  'src/bbGrid.Collection.js',
            'src/bbGrid.View.js',
        	  'src/bbGrid.TheadView.js',
        	  'src/bbGrid.RowView.js',
        	  'src/bbGrid.FilterView.js',
        	  'src/bbGrid.TfootView.js',
        	  'src/bbGrid.PagerView.js',
        	  'src/bbGrid.SearchView.js',
        	  'src/bbGrid.NavView.js',
            'node_modules/intl/Intl.js'
        ],
        dest: '<%= pkg.name %>.js'
      }
    },
    watch: {
      files: 'src/*.js',
      tasks: ['concat']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['concat']);

};
