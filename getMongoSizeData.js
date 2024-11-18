//mongosh <<CONNECTION_STRING>> getMongoSizeData.js --norc --quiet > <<CLUSTER_NAME>>.json
var _version = "0.9";

(function () {
  "use strict";
})();

// // Convert NumberLongs to strings to save precision
function longmangle(n) {
  if (!n instanceof NumberLong) return null;
  var s = n.toString();
  s = s.replace("NumberLong(", "").replace(")", "");
  if (s[0] == '"') s = s.slice(1, s.length - 1);
  return s;
}

// For use in JSON.stringify to properly serialize known types
function jsonStringifyReplacer(k, v) {
  if (v instanceof ObjectId) return { $oid: v.valueOf() };
  if (v instanceof NumberLong) return { $numberLong: longmangle(v) };
  if (v instanceof NumberInt) return v.toNumber();
  // For ISODates; the $ check prevents recursion
  if (typeof v === "string" && k.startsWith("$") == false) {
    try {
      iso = ISODate(v);
      return { $date: iso.valueOf() };
    } catch (e) {
      // Nothing to do here, we'll get the return at the end
    }
  }
  return v;
}

function printInfo(message, command) {
  var result = false;

  try {
    result = command();
    err = null;
  } catch (err) {
    if (!_printJSON) {
      print("Error running '" + command + "':");
      print(err);
    } else {
      throw "Error running '" + command + "': " + err;
    }
  }

  _output[message] = result;
  if (!_printJSON) printjson(result);
  return result;
}

function printServerInfo() {
  serverinfo = db.serverStatus();

  printInfo("serverInfo", function () {
    returnObj = {};
    try {
      returnObj = {
        binary: db.serverBuildInfo().modules[0]
          ? db.serverBuildInfo().modules[0]
          : "community",
        version: serverinfo.version,
        storageEngine:
          serverinfo.storageEngine && serverinfo.storageEngine.name,
        numCores: db.hostInfo().system && db.hostInfo().system.numCores,
        uptimeSec: serverinfo.uptime,
        pageFaults: serverinfo.extra_info && serverinfo.extra_info.page_faults,
        connections: serverinfo.connections,
        catalogStats: serverinfo.catalogStats,
        memSizeMB:
          db.hostInfo().system.memSizeMB instanceof NumberLong
            ? db.hostInfo().system.memSizeMB.toNumber()
            : db.hostInfo().system.memSizeMB,
        wiredtigerCacheSize:
          serverinfo.wiredTiger &&
          serverinfo.wiredTiger.cache &&
          serverinfo.wiredTiger.cache["maximum bytes configured"],
        bytesCurrentlyInCache:
          serverinfo.wiredTiger &&
          serverinfo.wiredTiger.cache &&
          serverinfo.wiredTiger.cache["bytes currently in the cache"],
        defaultReadConcern:
          serverinfo.defaultRWConcern &&
          serverinfo.defaultRWConcern.defaultReadConcern,
        defaultWriteConcern:
          serverinfo.defaultRWConcern &&
          serverinfo.defaultRWConcern.defaultWriteConcern,
        indexStats: serverinfo.indexStats,
        transactions: serverinfo.transactions,
      };
      returnObj.network = {
        bytesIn: serverinfo.network && serverinfo.network.bytesIn,
        bytesOut: serverinfo.network && serverinfo.network.bytesOut,
        compression: serverinfo.network && serverinfo.network.compression,
      };
      returnObj.metrics = {
        opcounters: serverinfo.opcounters,
        document: serverinfo.metrics && serverinfo.metrics.document,
        text:
          serverinfo.metrics &&
          serverinfo.metrics.operatorCounters &&
          serverinfo.metrics.operatorCounters.match &&
          serverinfo.metrics.operatorCounters.match.$text,
        regex:
          serverinfo.metrics &&
          serverinfo.metrics.operatorCounters &&
          serverinfo.metrics.operatorCounters.match &&
          serverinfo.metrics.operatorCounters.match.$regex,
        ttl: serverinfo.metrics && serverinfo.metrics.ttl,
        aggStageCounters:
          serverinfo.metrics && serverinfo.metrics.aggStageCounters,
        operatorCounters:
          serverinfo.metrics && serverinfo.metrics.operatorCounters,
      };
      returnObj.wiredTiger = {
        perf: serverinfo.wiredTiger && serverinfo.wiredTiger.perf,
        capacity: serverinfo.wiredTiger && serverinfo.wiredTiger.capacity,
        blockCache:
          serverinfo.wiredTiger && serverinfo.wiredTiger["block-cache"],
      };
    } catch (err) {
      _errors.push({
        function: "printServerInfo",
        error: err,
      });
    }
    return returnObj;
  });
}

function processRepSetConf() {
  try {
    var confInfo = rs.conf().members;
    printInfo("members", function () {
      return confInfo.length;
    });
    printInfo("replicaSetConfig", function () {
      confInfo.forEach((member) => {
        if (member.slaveDelay) {
          member.secondaryDelaySecs = member.slaveDelay.toNumber();
          delete member.slaveDelay;
        }
      });
      return confInfo;
    });
    printInfo("configuration", function () {
      return "ReplicaSet";
    });
    return true;
  } catch (err) {
    if (err.codeName === "NoReplicationEnabled") {
      printInfo("configuration", function () {
        return "SingleNode";
      });
      return false;
    } else {
      _errors.push({
        function: "processRepSetConf",
        error: err,
      });
    }
  }
}

function printShardOrReplicaSetInfo() {
  try {
    if (db.serverStatus().process === "mongos") {
      //sharded
      printShardInfo();
      return true;
    } else {
      //replicaset or standalone
      printReplicaSetInfo();
      return false;
    }
  } catch (err) {
    _errors.push({
      function: "printShardOrReplicaSetInfo",
      error: err,
    });
  }
}

function printShardInfo() {
  section = "shard_info";
  var configDB = db.getSiblingDB("config");

  printInfo("shardingVersion", function () {
    try {
      return configDB.getCollection("version").findOne();
    } catch (err) {
      _errors.push({
        function: "shardingVersion",
        error: err,
      });
    }
  });

  printInfo("shardingSettings", function () {
    try {
      return configDB.settings.find().sort({ _id: 1 }).toArray();
    } catch (err) {
      _errors.push({
        function: "shardingSettings",
        error: err,
      });
    }
  });

  printInfo("routers", function () {
    try {
      return configDB.mongos.find().sort({ _id: 1 }).toArray();
    } catch (err) {
      _errors.push({
        function: "routers",
        error: err,
      });
    }
  });

  printInfo("shards", function () {
    try {
      return configDB.shards.find().sort({ _id: 1 }).toArray();
    } catch (err) {
      _errors.push({
        function: "shards",
        error: err,
      });
    }
  });

  printInfo("shardedDatabases", function () {
    try {
      var ret = [];
      configDB.databases
        .find()
        .sort({ name: 1 })
        .forEach(function (db) {
          doc = {};
          for (k in db) {
            if (db.hasOwnProperty(k)) doc[k] = db[k];
          }
          if (db.partitioned) {
            doc["collections"] = [];
            configDB.collections
              .find({ _id: db._id })
              .sort({ _id: 1 })
              .forEach(function (coll) {
                if (coll.dropped !== true) {
                  collDoc = {};
                  collDoc["_id"] = coll._id;
                  collDoc["key"] = coll.key;
                  collDoc["unique"] = coll.unique;

                  var res = configDB.chunks.aggregate(
                    { $match: { ns: coll._id } },
                    { $group: { _id: "$shard", nChunks: { $sum: 1 } } }
                  );
                  // MongoDB 2.6 and above returns a cursor instead of a document
                  res = res.result ? res.result : res.toArray();

                  collDoc["distribution"] = [];
                  res.forEach(function (z) {
                    chunkDistDoc = { shard: z._id, nChunks: z.nChunks };
                    collDoc["distribution"].push(chunkDistDoc);
                  });

                  if (_printChunkDetails) {
                    collDoc["chunks"] = [];
                    configDB.chunks
                      .find({ ns: coll._id })
                      .sort({ min: 1 })
                      .forEach(function (chunk) {
                        chunkDoc = {};
                        chunkDoc["min"] = chunk.min;
                        chunkDoc["max"] = chunk.max;
                        chunkDoc["shard"] = chunk.shard;
                        chunkDoc["jumbo"] = chunk.jumbo ? true : false;
                        collDoc["chunks"].push(chunkDoc);
                      });
                  }

                  collDoc["tags"] = [];
                  configDB.tags
                    .find({ ns: coll._id })
                    .sort({ min: 1 })
                    .forEach(function (tag) {
                      tagDoc = {};
                      tagDoc["tag"] = tag.tag;
                      tagDoc["min"] = tag.min;
                      tagDoc["max"] = tag.max;
                      collDoc["tags"].push(tagDoc);
                    });
                  doc["collections"].push(collDoc);
                }
              });
          }
          ret.push(doc);
        });
      return ret;
    } catch (err) {
      _errors.push({
        function: "shardedDatabases",
        error: err,
      });
    }
  });
}

function printReplicaSetInfo() {
  if (processRepSetConf()) {
    printInfo("replicationInfo", function () {
      returnObj = {};
      try {
        returnObj = {
          logSizeMB: db.getReplicationInfo().logSizeMB, // Comes in as MB
          usedMB: db.getReplicationInfo().usedMB, // Comes in as MB
          timeDiffHours: db.getReplicationInfo().timeDiffHours,
        };
      } catch (err) {
        _errors.push({
          function: "printReplicaSetInfo",
          error: err,
        });
        console.log(err);
      }
      return returnObj;
    });
  }
}

function parseCollectionStatsCreationString(creationString) {
  returnObj = [];
  try {
    const creationStringArray = creationString.split(",");
    creationStringArray.forEach((key) => {
      if (key.startsWith("block_compressor")) {
        returnObj.push({
          block_compressor: key.split("=")[1],
        });
      }
    });
  } catch (err) {
    _errors.push({
      function: "parseCollectionStatsCreationString",
      error: err,
    });
  }
  return returnObj;
}

function printDataInfo() {
  section = "data_info";
  var totalIndexSize = 0,
    totalStorageSize = 0,
    totalDataSize = 0,
    nIndexes = 0;
  var dbs = db.getMongo().getDBs();
  dbs.databases.sort((a, b) => b.sizeOnDisk - a.sizeOnDisk);
  var collections_counter = 0;
  try {
    if (dbs.databases) {
      var dbstats = [];
      dbs.databases.forEach(function (mydb) {
        if (!/admin|config|local/.test(mydb.name)) {
          var stats = db.getSiblingDB(mydb.name).stats();
          var collectionstats = [];
          db.getSiblingDB(mydb.name)
            .getCollectionInfos({ type: "collection" })
            .forEach(function (collectionInfo) {
              if (!/system/.test(collectionInfo.name)) {
                //check max collections;
                if (collections_counter < _maxCollections) {
                  var colstats = db
                    .getSiblingDB(mydb.name)
                    .getCollection(collectionInfo["name"])
                    .stats();
                  var indexstatss = db.getSiblingDB(mydb.name).runCommand({
                    aggregate: collectionInfo["name"],
                    pipeline: [
                      { $indexStats: {} },
                      { $project: { host: 0, spec: 0 } },
                    ],
                    cursor: {},
                  }).cursor.firstBatch;

                  //get shard distribution
                  var shardDistribution = null;
                  if (isMongoS) {
                    try {
                      shardDistribution = db
                        .getSiblingDB(mydb.name)
                        .getCollection(collectionInfo["name"])
                        .getShardDistribution();
                    } catch (e) {
                      //Nothing to do, collection not sharded
                    }
                  }
                  collectionstats.push({
                    name: collectionInfo["name"],
                    dataSize: colstats.size,
                    storageSize: colstats.storageSize,
                    count: colstats.count,
                    avgObjSize: colstats.avgObjSize,
                    freeStorageSize: colstats.freeStorageSize,
                    capped: colstats.capped,
                    nindexes: colstats.nindexes,
                    indexBuilds: colstats.indexBuilds,
                    totalIndexSize: colstats.totalIndexSize,
                    totalSize: colstats.totalSize,
                    creationString:
                      colstats.wiredTiger && colstats.wiredTiger.creationString,
                    parsedCreationString: parseCollectionStatsCreationString(
                      colstats.wiredTiger && colstats.wiredTiger.creationString
                    ),
                    shardDistribution: shardDistribution,
                    indexes: {
                      indexSizes: colstats.indexSizes,
                      stats: indexstatss,
                    },
                  });
                }
                collections_counter++;
              }
            });

          dbstats.push({
            db: stats.db,
            collections: stats.collections,
            views: stats.views,
            dataSize: stats.dataSize,
            storageSize: stats.storageSize,
            indexSize: stats.indexSize,
            totalSize: stats.totalSize,
            avgObjSize: stats.avgObjSize,
            indexes: stats.indexes,
            collectionstats: collectionstats,
          });
          totalIndexSize += Number(stats.indexSize);
          totalStorageSize += Number(stats.storageSize);
          totalDataSize += Number(stats.dataSize);
          nIndexes += Number(stats.indexes);
        }
      });
      printInfo("databaseStats", function () {
        return dbstats;
      });
      printInfo("nDatabases", function () {
        return db.getMongo().getDBNames().length - 3;
      });
      printInfo("totalDataSize", function () {
        return totalDataSize;
      });
      printInfo("totalStorageSize", function () {
        return totalStorageSize;
      });
      printInfo("totalIndexSize", function () {
        return totalIndexSize;
      });
      printInfo("nCollections", function () {
        return collections_counter;
      });
      printInfo("nIndexes", function () {
        return nIndexes;
      });
    }
    if (collections_counter > _maxCollections) {
      throw {
        message:
          "MaxCollectionsExceededException: There are " +
          collections_counter +
          " collections " +
          "which is above the max allowed of " +
          _maxCollections +
          " for this script. No more database and " +
          "collection-level stats will be gathered, so the overall data is " +
          "incomplete. ",
      };
    }
  } catch (e) {
    _errors.push({
      function: "printDataInfo",
      error: e.message,
    });
  }
}

function additionalInfo() {
  printInfo("serverCmdLineOpts", function () {
    try {
      serverCmdLineOpts = db.serverCmdLineOpts();
      return {
        arguments: serverCmdLineOpts.argv,
        parsed: serverCmdLineOpts.parsed,
      };
    } catch (err) {
      _errors.push({
        function: "additionalInfoServerCmdLineOpts",
        error: err,
      });
    }
  });

  printInfo("clusterAuthMode", function () {
    try {
      return db.adminCommand({
        getParameter: 1,
        clusterAuthMode: 1,
      }).clusterAuthMode;
    } catch (err) {
      _errors.push({
        function: "additionalInfoClusterAuthMode",
        error: err,
      });
    }
  });

  printInfo("shellVersion", function () {
    try {
      return version();
    } catch (err) {
      _errors.push({
        function: "additionalInfoVersion",
        error: err,
      });
    }
  });

  printInfo("tlsMode", function () {
    try {
      return db.adminCommand({ getParameter: "*" }).tlsMode;
    } catch (err) {
      _errors.push({
        function: "additionalInfoTlsMode",
        error: err,
      });
    }
  });

  printInfo(
    "scriptInfo",
    function () {
      return { v: _version, ts: new Date() };
    },
    section
  );

  printInfo("errors", function () {
    return _errors;
  });
}

if (typeof _printJSON === "undefined") var _printJSON = true;
if (typeof _printChunkDetails === "undefined") var _printChunkDetails = false;
if (typeof _ref === "undefined") var _ref = null;

// Limit the number of collections this script gathers stats on in order
// to avoid the possibility of running out of file descriptors. This has
// been set to an extremely conservative number but can be overridden
// by setting _maxCollections to a higher number prior to running this
// script.
if (typeof _maxCollections === "undefined") var _maxCollections = 2500;

var _total_collection_ct = 0;
var _output = {};
var _errors = [];
var _tag = ObjectId();
if (!_printJSON) {
  print("================================");
  print("MongoDB Config and Schema Report");
  print("getMongoData.js version " + _version);
  print("================================");
}

try {
  printServerInfo();
  var isMongoS = printShardOrReplicaSetInfo();
  printDataInfo(isMongoS);
  additionalInfo();
} catch (e) {
  // To ensure that the operator knows there was an error, print the error
  // even when outputting JSON to make it invalid JSON.
  print("\nERROR: " + e.message);
}

// Print JSON output
// use value < 0 for no spaces
if (_printJSON) print(JSON.stringify(_output, jsonStringifyReplacer, 4));
