var Instance = require('../Instance');

var githubServer = Instance.Factory('github');
githubServer.delete(function() {
  githubServer.build(function(err, ok) {
    if (err) {
      console.error('Error building github instance');
      console.error(err);
    } else {
      githubServer.tail_gce_console(function(err, data) {
        console.log(data);
        if (data.toString().match('__ALIVE__')) {
          return true;
        }
      });
    }
  });
});
