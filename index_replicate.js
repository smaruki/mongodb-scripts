/* 
* Copies the indexes from one instance to another
* WARNING - DO NOT RUN THIS SCRIPT IN PRODUCTION ENVIRONMENT WITH LARGE VOLUMES OF DATA
*/

drop_indexes_before = true;

host_name_master = 'localhost:27018';
db_name_master = 'sergiodb';

host_name_replica = 'localhost:27017';
db_name_replica = 'sergiodb';

db_master = new Mongo(host_name_master).getDB(db_name_master);
db_replica = new Mongo(host_name_replica).getDB(db_name_replica);

db_master.getCollectionNames().forEach(
function(c){
    indexes = db_master.getCollection(c).getIndexes();
    new_indexes = []
    for(x in indexes){
        delete indexes[x]['v'];
        delete indexes[x]['ns'];
        new_indexes.push(indexes[x]);
    }
    print('\n//'+c);
    if(drop_indexes_before === true){
        printjson(db_replica.getCollection(c).dropIndexes());
    }        
    op = db_replica.runCommand({"createIndexes": c, "indexes": new_indexes});
    printjson(op);
}
)