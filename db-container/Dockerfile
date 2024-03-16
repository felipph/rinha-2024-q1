FROM postgres:latest

RUN mkdir -p /pgsql/data
RUN mkdir -p /pgsql/index
RUN chmod 777 -R /pgsql
RUN chown postgres:postgres /pgsql -R

COPY pgcenter /usr/bin/pgcenter