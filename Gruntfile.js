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
            'src/bbGrid.FilterView.js',
            'src/bbGrid.SearchView.js',
            'src/bbGrid.RowCountView.js',
        	  'src/bbGrid.RowView.js',
        	  'src/bbGrid.TfootView.js',
        	  'src/bbGrid.PagerView.js',
        	  'src/bbGrid.NavView.js',
            'node_modules/intl/Intl.js'
        ],
        dest: '<%= pkg.name %>.js'
      }
    },
    uglify: {
      js: {
        options: {
          sourceMap: true,
          compress: {
            drop_console: true
          }
        },
        files: {
          '<%= pkg.name %>.min.js': [ '<%= pkg.name %>.js' ]
        }
      }
    },
    watch: {
      files: 'src/*.js',
      tasks: ['concat','uglify']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['concat','uglify','watch']);

};
