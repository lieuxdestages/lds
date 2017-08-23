module.exports = function(grunt){
  const devPort       = 9200,
    connectPort        = 9287;

  require('load-grunt-tasks')(grunt);

  var baseUrl = 'https://lieuxdestages.github.io/lds';

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
          'public/css/lds.css': ['less/lds.less']
        }]
      },
      light: {
        options: {
          banner: '/* GENERATED 4 LDS */\n',
          sourceMap: true,
          ieCompat: true
        },
        files: [{
          'public/css/lds-light.css': ['less/lds-light.less']
        }]
      }
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
      config_dev: {
        src: 'js/dev-constants.js', dest: 'public/js/constants.js'
      },
      dev: {
        src: 'index.html', dest: 'public/index.html',
        options: {
          process: function (content) {
            content = content.replace(/%BASE_PATH%/g, '');
            content = content.replace(/%DEPENDENCIES%/g, '<script src="config.js"></script>');
            return content;
          }
        }
      },
      config_dist: {
        src: 'js/prod-constants.js', dest: 'public/js/constants.js'
      },
      dist: {
        files: [{
          expand: true, dot: true,
          cwd: 'public', dest: 'docs',
          src: [
            'css/font-awesome.min.css',
            'css/lds.css',
            'css/lds-light.css',
            'img/**/*',
            'favicon.ico',
            'lib/system.js'
          ]
        }]
      },
      distIndex: {
        src: 'index.html', dest: 'docs/index.html',
        options: {
          process: function (content) {
            content = content.replace(/%BASE_PATH%/g, baseUrl);
            content = content.replace(/%DEPENDENCIES%/g, '<script src="' + baseUrl + '/js/libs.js"></script>\n    <script src="' + baseUrl + '/js/lds.js"></script>');
            return content;
          }
        }
      }
    },
    md5: {
      bundle: {
        files: {
          'docs/js/': 'tmp/*.js'
        },
        options: {
          keepBasename: true,
          keepExtension: true
        }
      }
    },
    shell: {
      bundle: {
        command: [
          'jspm bundle js/lds.js - jquery - moment tmp/lds.js --minify --skip-source-maps',
          'jspm bundle jquery + moment tmp/libs.js --minify --skip-source-maps'
        ].join('&&')
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
      html: {
        files: ['index.html'],
        tasks: ['copy:dev']
      },
      i18n: {
        files: ['public/i18n/*.js'],
        tasks: []
      },
      js: {
        files: ['public/js/**/*.js'],
        tasks: []
      },
      css: {
        files: ['less/*.less'],
        tasks: ['less']
      }
    }
  });

  grunt.registerTask('release', ['less', 'cssmin', 'copy:config_dist', 'shell:bundle', 'copy:dist', 'copy:distIndex', 'md5']);
  grunt.registerTask('dev', ['less', 'copy:config_dev', 'copy:dev', 'connect:local', 'watch']);
  grunt.registerTask('default', ['usage']);
};
