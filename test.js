var Ins = require('./Instance');
var projectId = 'focal-inquiry-92622';

var sivart_master = new Ins(projectId, 'us-central1-a', 'sivart-master');

sivart_master.create({ file: '../sivart/gce/sivart-master.json' }, function(err, resp) {
  console.log(err, resp);
  sivart_master.tail_gce_console(function(err, data) {
    console.log(data);
    if (data.toString().match('__ALIVE__')) {
      return true;
    }
  });
});

