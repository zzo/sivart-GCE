var Instance = require('../Instance');

var uiServer = Instance.Factory('ui');
uiServer.delete(function() {
  uiServer.build(function(err, ok) {
    if (err) {
      console.error('Error building ui instance');
      console.error(err);
    } else {
      uiServer.tail_gce_console(function(err, data) {
        console.log(data);
        if (data.toString().match('__ALIVE__')) {
          return true;
        }
      });
    }
  });
});
