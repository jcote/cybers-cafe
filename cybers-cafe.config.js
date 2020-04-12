module.exports = {
  apps : [
      {
        name: "Cybers Cafe",
        script: "./app.js",
        watch: true,
        env: {
          "GOOGLE_APPLICATION_CREDENTIALS":"/home/latte/.google/Cybers Cafe-cc5478d309c4.json",
          "DATA_BACKEND": "datastore",
          "GCLOUD_PROJECT": "cybers-cafe",
          "CLOUD_BUCKET": "cybers-cafe",
          "MYSQL_USER":"cyberscafe",
          "MYSQL_PASSWORD":"sparkle8twilight",
          "MYSQL_DATABASE":"cyberscafe",
          "MYSQL_HOST":"localhost",
          "PORT": 8080
        }
      }
  ]
}
