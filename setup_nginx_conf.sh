#!/bin/bash
ln -s /var/www/cybers-cafe/cybers-cafe/system/files/www.cybers.cafe-ssl.conf /etc/nginx/sites-available/www.cybers.cafe-ssl.conf
ln -s /etc/nginx/sites-available/www.cybers.cafe-ssl.conf /etc/nginx/sites-enabled/www.cybers.cafe-ssl.conf 

ln -s /var/www/cybers-cafe/cybers-cafe/system/files/cybers.cafe-ssl.conf /etc/nginx/sites-available/cybers.cafe-ssl.conf
ln -s /etc/nginx/sites-available/cybers.cafe-ssl.conf /etc/nginx/sites-enabled/cybers.cafe-ssl.conf 

openssl dhparam -out /etc/ssl/certs/dhparam.pem 4096

cp /var/www/cybers-cafe/cybers-cafe/system/snippets/ssl-params.conf /etc/nginx/snippets/ssl-params.conf
