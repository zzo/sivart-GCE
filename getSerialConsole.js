var Instance = require('./Instance');
var Auth = require('./Auth');
var instance = new Instance(Auth.projectId, Auth.zone, process.argv[2]);
instance.tail_gce_console(function(err, data) {
  if (data) {
    console.log(data);
  }
});
