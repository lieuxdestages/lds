module.exports = function(grunt){
  const devPort       = 9200,
    connectPort        = 9287;

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: [
      ]
    },
    less: {
      default: {
        options: {
          banner: '/* GENERATED 4 LDS */\n',
          sourceMap: true,
          ieCompat: true
        },
        files: [{
          'public/css/lds.css': ['less/*.less']
        }]
      },
    },
    cssmin: {
      options: {
      },
      target: {
        files: {
          'docs/css/lds.css': ['public/css/lds.css']
        }
      }
    },
    connect: {
      options: {
        port: connectPort,
        hostname: 'localhost'
      },
      local: {
        options: {
          base: ['public'],
          port: 9200,
          open: true,
          livereload: 29976
        }
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: 'public',
          dest: 'docs',
          src: [
            'css/font-awesome.min.css',
            'img/**/*',
            'index.html',
            'favicon.ico',
            'js/lds.js'
          ]
        }]
      }
    },
    uglify: {
      options: {
        mangle: false,
        compress: {
          drop_console: true
        }
      }
    },
    usage: {
      options: {
        'title': 'LDS\n',
        'taskGroups': [{
          'header': 'Release tasks',
          'tasks': ['release']
        },{
          'header': 'Dev tasks',
          'tasks': ['dev']
        }],
        'taskDescriptionOverrides': {
          'dev': 'Runs livereload development server.'
        }
      }
    },
    watch: {
      options: {
        livereload: 29976
      },
      sources: {
        files: ['public/index.html', 'public/lds.js', 'public/i18n/*.js'],
        tasks: []
      },
      css: {
        files: ['less/*.less'],
        tasks: ['less']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-usage');

  grunt.registerTask('release', ['less', 'cssmin', 'copy:dist']);
  grunt.registerTask('dev', ['less', 'connect:local', 'watch']);
  grunt.registerTask('default', ['usage']);
};
