# /CYBERS CAFE/
* git clone both repositories to /var/www/cybers-cafe

* create ssl keys with certbot
  * https://certbot.eff.org/lets-encrypt/ubuntubionic-nginx (select WILDCARD)
  * https://certbot-dns-digitalocean.readthedocs.io/
  * sudo mkdir /var/log/nginx/www.cybers.cafe
  * sudo mkdir /var/log/nginx/cybers.cafe
  * sudo mkdir /var/log/nginx/service.cybers.cafe

* setup NGINX
  * sudo apt-get install nginx
  * sudo ./setup_nginx_conf.sh in cybers-cafe and cybers-cafe-service

* setup the cloud-sql-proxy service (see cybers-cafe-service project, service txt file)
  * wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
  * chmod +x cloud_sql_proxy
  * scp Google service account credentials (https://console.cloud.google.com/iam-admin/serviceaccounts/create?previousPage=%2Fapis%2Fcredentials%3Fproject%3Dcybers-cafe&project=cybers-cafe)
  * edit cloud-sql-proxy.sh to point to cloud-sql-proxy binary and Google credentials
  * systemctl enable /etc/systemd/system/sql-proxy.service
  * systemctl daemon-reexec OR
  * systemctl daemon-reload
  * systemctl start cloud-sql-proxy.service

* don't forget to `source env.sh` before running cybers-cafe and service

* setup pm2 for cybers-cafe and cybers-cafe-service
  * npm install pm2@latest -g
  * pm2 startup systemd
  * pm2 start cybers-cafe.pm2.js
  * pm2 start cybers-cafe-service.pm2.js
  * pm2 save
  * sudo systemctl start pm2-[USER]
* check that everything runs on startup
  * sudo reboot
  * systemctl status sql-proxy.service
  * pm2 status

