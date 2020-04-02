module.exports = {
  apps : [
      {
        name: "Cybers Cafe",
        script: "./app.js",
        watch: true,
        env: {
		"MYSQL_USER":"cyberscafe",
		"MYSQL_PASSWORD":"sparkle8twilight",
		"MYSQL_DATABASE":"cyberscafe",
		"MYSQL_HOST":"localhost"
        }
      }
  ]
}
