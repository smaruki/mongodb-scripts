//mongosh <<CONNECTION_STRING>> getDetailedInformationJS-v2.js --norc --quiet > <<CLUSTER_NAME>>.json
var s="";
function xprint(p) {
  s=s+p
}
function getDetailedInformationJS() {
var db = this.db.getSiblingDB("admin");
var totalIndexSize = 0,
   totalStorageSize = 0,
   totalDataSize = 0,
   formatSize = 1024 * 1024 * 1024;
var dbs = db.runCommand({ listDatabases: 1 }).databases;
print('{')
print('  databases:[')
dbs.forEach(function (database) {
   if (!/admin|config|local/.test(database.name)) {
     db = db.getSiblingDB(database.name);
     stats = db.stats();
     xprint(`\n  {DB: "${database.name}",`, end =" ");
     stats.collections && xprint(`   Collections: "${stats.collections}",`, end =" ");
     stats.objects && xprint(`   Objects: "${(stats.objects / 1)}",`, end =" ");
     stats.views && xprint(`   Views: "${stats.views}",`, end =" ");
     xprint(`   NumIndexes: "${stats.indexes}",`, end =" ");
     xprint(`   IndexSizeGB: "${(stats.indexSize / formatSize).toFixed(5)}",`, end =" ");
     xprint(`   DataSizeGB: "${(stats.dataSize / formatSize).toFixed(5)}",`, end =" ");
     xprint(`   StorageSizeGB: "${(stats.storageSize / formatSize).toFixed(5)}",`, end =" ");
     xprint(`   AverageObjSizeB: "${stats.avgObjSize.toFixed(0)}"`, end =" ");
     totalDataSize += stats.dataSize;
     totalStorageSize += stats.storageSize;
     totalIndexSize += stats.indexSize;
     xprint('  },')
     print(s);s="";
   }
});
print('  ],')
print('totals:{')
print(`  DataSizeGB: "${(totalDataSize / formatSize).toFixed(5)}",`);
print(`  StorageSizeGB: "${(totalStorageSize / formatSize).toFixed(5)}",`);
print(`  IndexSizeGB: "${(totalIndexSize / formatSize).toFixed(5)}",`);
 if (!db.serverStatus().errmsg) {
   print(`  MongoDBVersion: "${db.serverStatus().version}",`);
   db.serverStatus().storageEngine && print(`  StorageEngine: "${db.serverStatus().storageEngine.name}",`);
   db.hostInfo().system && print(`  CPUCores: "${db.hostInfo().system.numCores}",`);
   db.hostInfo().system && print(`  MemorySizeMB: "${db.hostInfo().system.memSizeMB}",`);
   db.serverStatus().repl && print(`  Hosts: "${db.serverStatus().repl.hosts}"`);
}
print('  }')
print('}')
}
getDetailedInformationJS();
