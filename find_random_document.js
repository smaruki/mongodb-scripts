collection = 'mycoll';
db[collection].find().limit(-1).skip(Math.floor((Math.random() * db[collection].count()) + 1));
