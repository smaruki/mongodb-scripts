/* Kill all queries with more than X secs running */
db = new Mongo('localhost').getDB('test')

var secs_limit = 10

db.currentOp().inprog.forEach(
    function(d){
        if(d.active && d.secs_running>secs_limit){
                var op = db.killOp(d.opid);
                print(op);
             }
        })

print('Done')
