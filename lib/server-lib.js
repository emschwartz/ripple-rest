var async = require('async');

module.exports = {
  CONNECTION_TIMEOUT: 20000,
  getStatus: getStatus,
  isConnected: isConnected,
  ensureConnected: ensureConnected,
  remoteHasLedger: remoteHasLedger
};

/**
 *  Check if remote is connected and attempt to reconnect if not
 */
function ensureConnected(remote, callback) {

  if (isConnected(remote)) {
    callback(null, true);
    return;
  } else {
    attemptConnect(remote, callback);
    return;
  }

}

/**
 *  Determine if remote is connected based on time of last ledger closed
 */
function isConnected(remote) {
  if (!remote) {
    return false;
  }

  var server = remote._getServer();
  if (!server) {
    return false;
  }

  return (Date.now() - server._lastLedgerClose <= module.exports.CONNECTION_TIMEOUT);
}


/**
 *  Attempt to reconnect, waiting no longer than 20
 *  seconds after the last ledger_closed event was heard
 */
function attemptConnect(remote, callback) {

  var connected = false;

  function onLedgerClosed() {
    if (isConnected(remote)) {
      connected = true;
      remote.removeListener('ledger_closed', onLedgerClosed);
      callback(null, true);
      return;
    }
  }

  remote.once('ledger_closed', onLedgerClosed);

  setTimeout(function(){
    remote.removeListener('ledger_closed', onLedgerClosed);
    if (!connected) {
      callback(new Error('Cannot connect to rippled. No "ledger_closed" events were heard within 20 seconds, most likely indicating that the connection to rippled has been interrupted or the rippled is unresponsive. Please check your internet connection and server settings and try again.'));
    }
    return;
  }, module.exports.CONNECTION_TIMEOUT);

  remote.connect();

}


function getStatus(remote, callback) {

  var status = {
    api_server_status: 'online'
  };

  var steps = [

    function(async_callback) {
      ensureConnected(remote, async_callback);
    },

    function(connected, async_callback) {
      remote.requestServerInfo(async_callback);
    },

    function(server_info, async_callback) {
      var results = {};

      results.rippled_server_url = remote._getServer()._opts.url;
      results.rippled_server_status = server_info.info;

      async_callback(null, results);
    } 

  ];

  async.waterfall(steps, callback);
}

function remoteHasLedger(remote, ledger, callback) {

  var ledger_index = parseInt(ledger, 10);

  getStatus(remote, function(err, status){
    if (err) {
      callback(err);
      return;
    }

    var ledger_range = status.rippled_server_status.complete_ledgers,
      match = ledger_range.match(/([0-9]+)-([0-9]+)$/),
      min = parseInt(match[1], 10),
      max = parseInt(match[2], 10);

    if (ledger_index >= min && ledger_index <= max) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  });
}
