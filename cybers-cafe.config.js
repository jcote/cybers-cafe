module.exports = {
  apps : [
      {
        name: "Cybers Cafe",
        script: "./app.js",
        watch: true,
        env: {
          "GOOGLE_APPLICATION_CREDENTIALS":"/home/nonki/.google/cybers-cafe-cb3ce5122c96.json",
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
