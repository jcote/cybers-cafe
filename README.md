
* setup the cloud-sql-proxy service (see cybers-cafe-service project, *-service.txt files)
  * to start manually:
  * systemctl daemon-reexec
  * systemctl start cloud-sql-proxy.service
  * systemctl start cybers-cafe-service.service
* don't forget to `source env.sh` before running cybers-cafe and service


# 2 - Structured data

This folder contains the sample code for the [Structured data][step-2]
tutorial. Please refer to the tutorial for instructions on configuring, running,
and deploying this sample.

[step-2]: https://cloud.google.com/nodejs/getting-started/using-structured-data
