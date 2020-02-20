#!/usr/bin/env bash

printf "Start Transit App\n"

rm *.log
rm *.err

# export NAMESPACE_NAME=Transit-Event-Hub
# export AGGREGATE_HUB_NAME=countshub
# export AIRPLANE_HUB_NAME=Transithub
# export SASKEY_NAME=RootManageSharedAccessKey
# export SAS_KEY=/YGVFRTPSZCFZguDN88R+CVk699UIa7Fl8akJc0npuk=

printf "Start server\n"
cd ../server
./dist/swim-transit-3.11.0-SNAPSHOT/bin/swim-transit  > ../app.log 2> ../app.err < /dev/null &

printf "Startup complete\n"