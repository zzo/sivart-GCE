var Instance = require('./Instance');
var Auth = require('./Auth');
var instance = new Instance(Auth.projectId, Auth.zone, 'x-1431746884390-7c99c1e8-5744-4103-a16a-902347e47100');
instance.tail_gce_console(function(err, data) {
  if (data) {
    console.log(data);
  }
});
