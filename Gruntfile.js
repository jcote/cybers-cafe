module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      home: {
        src: 'src/home.js',
        dest: 'scripts/home.js'
      },
      mathutils: {
        src: 'src/mathutils.js',
        dest: 'scripts/mathutils.js'
      },
      movement: {
        src: 'src/movement.js',
        dest: 'canvas/files/assets/6320152/1/movement.js'
      },
      network: {
        src: 'src/Network.js',
        dest: 'canvas/files/assets/6178170/1/Network.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify']);

};