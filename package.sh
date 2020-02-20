
printf "Packaging app\n"

rm -rf ./server/dist

mkdir ./server/dist

printf "\nBuild App Server\n"
cd server/
./gradlew build

cd ../

printf "\nPrepare App Server Dist folder\n"
tar -xf ./server/build/distributions/swim-transit-3.11.0-SNAPSHOT.tar -C ./appServer/dist/
rm server/dist/swim-transit-3.11.0-SNAPSHOT/lib/jffi-1.2.17-native.jar

printf "\ndone.\n"