/*
* Copies the indexes from one instance to another
* WARNING - DO NOT RUN THIS SCRIPT IN PRODUCTION ENVIRONMENT WITH LARGE VOLUMES OF DATA
* Author: Sergio Maruki
*/

dropIndexesFromDest = false;

hostOrig = '127.0.0.1:27017';
dbNameOrig = 'mongo_netshoes';

hostDest = '127.0.0.1:27017';
dbNameDest = 'database2';

dbOrig = new Mongo(hostOrig).getDB(dbNameOrig);
dbDest = new Mongo(hostDest).getDB(dbNameDest);

print("//Copying indexes from "+hostOrig+"/"+dbNameOrig+" to "+hostDest+"/"+dbNameDest)

dbOrig.getCollectionNames().forEach(
    function(c){
        indexes = dbOrig.getCollection(c).getIndexes();
        newIndexes = []
        for(x in indexes){
            if(indexes[x]['name'] != '_id_'){
                delete indexes[x]['v'];
                delete indexes[x]['ns'];
                newIndexes.push(indexes[x]);
            }
        }
        print('\n//'+c);
        if(dropIndexesFromDest === true){
            printjson(dbDest.getCollection(c).dropIndexes());
        }
        if(typeof newIndexes[0] !== 'undefined') {
            op = dbDest.runCommand({"createIndexes": c, "indexes": newIndexes});
            printjson(op);
        }
    }
)
