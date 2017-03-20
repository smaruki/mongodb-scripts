#mongodb-scripts
Useful scripts for administrate and operate MongoDB.

**show_collections_size.js** <br>
Show collections size in MB <br>
Replace to your database name.<br>
Example: mongo get_collections_size.js

**show_slow_operations.js** <br>
Show operations running over x seconds.<br>
Example: mongo show_slow_operations.js

**kill_slow_operations.js**<br>
Kill all operations running over x seconds.<br>
Example: mongo kill_slow_operations.js

**show_parameters.js**<br>
Show all MongoDB parameters.<br>
Example: mongo show_parameters.js

**set_parameter_loglevel.js**<br>
Sets verbosity of the logging, specifying an integer between 0 and 5  where 5 is the most verbose.<br>
Example: mongo set_parameter_loglevel.js

**repair_database.js** <br>
Server side to do shrink and repair database. <br>
Replace to your database and collection names.<br>
Example: mongo repair_database.js

**show_all_dbstats.js** <br>
Show all paramaters and stats from database.
Example: mongo show_all_dbstats.js > all_stats.log

**index_replicate.js** <br>
Copies the indexes from one instance to another
Set variables: 
drop_indexes_before = <bool>
host_name_master = <host_from>;
db_name_master = <db_from>;
host_name_replica = <host_to>;
db_name_replica = <db_to>;
Example: mongo index_replicate.js