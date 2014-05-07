var ripple = require('ripple-lib');
var async = require('async');
var _ = require('lodash');

var transactions_lib = require('./transactions');
var validator = require('../lib/schema-validator');
var server_lib = require('../lib/server-lib');
var notification_formatter = require('../lib/formatters/notification-formatter');

function _getNotification($, req, res, callback) {

  $.opts = {
    account: req.params.account,
    identifier: req.params.identifier
  };

  // getTransaction also handles parameter validation and
  // checks the status of the connection to rippled
  function getTransaction(async_callback) {
    transactions_lib.getTransaction($, req, res, async_callback);
  };

  function checkLedger(base_transaction, async_callback) {
    server_lib.remoteHasLedger($.remote, base_transaction.ledger_index, function(err, remote_has_ledger) {
      if (err) {
        return async_callback(err);
      }

      if (remote_has_ledger) {
        async_callback(null, base_transaction);
      } else {
        res.json(404, { succes: false, message: 'Cannot Get Notification. This transaction is not in the ripple\'s complete ledger set. Because there is a gap in the rippled\'s historical database it is not possible to determine the transactions that precede this one' });
      }
    });
  };

  function prepareResponse(base_transaction, async_callback) {
    var notification_details = {
      account:         $.opts.account,
      identifier:      $.opts.identifier,
      transaction:     base_transaction
    };

    async_callback(null, notification_details);
  };

  function attachSurroundingIdentifiers(notification_details, async_callback) {
    attachPreviousAndNextTransactionIdentifiers($, notification_details, async_callback);
  };

  function parseNotification(notification_details, async_callback) {
    notification_formatter.parseNotificationFromTransaction(notification_details, $.opts, async_callback);
  };

  var steps = [
    getTransaction,
    checkLedger,
    prepareResponse,
    attachSurroundingIdentifiers,
    parseNotification
  ];

  async.waterfall(steps, callback);
};

exports.getNotification = getNotification;

function getNotification($, req, res, next) {
  _getNotification($, req, res, function(err, notification) {
    if (err) {
      return next(err);
    }

    if (!notification) {
      return res.json(404, {
        success: false,
        message: 'Transaction Not Found. Could not get the notification corresponding to this transaction identifier. This may be because the transaction was never validated and written into the Ripple ledger or because it was not submitted through this ripple-rest instance. This error may also be seen if the databases of either ripple-rest or rippled were recently created or deleted.'
      });
    }

    var url_base = req.protocol + '://' + req.host + ({80: ':80', 443: ':443' }[$.config.get('PORT')] || '');
    var client_resource_id = notification.client_resource_id;
    delete notification.client_resource_id;

    var response = {
      success: true,
      notification: notification
    }

    if (client_resource_id) {
      response.client_resource_id = client_resource_id;
    }

    res.json(response);
  });
};

exports.getNextNotification = getNextNotification;

function getNextNotification($, req, res, next) {
  _getNotification($, req, res, function(err, notification) {
    if (err) {
      next(err);
    } else {
      res.redirect(notification.next_notification_url);
    }
  });
};

/**
 *  Find all of the possible previous and next transactions, both from the rippled
 *  and from the local failures saved in the outgoing_transactions table. Once
 *  those have been arranged, find the base transaction amongst them and attach
 *  the hash or client_resource_ids of the previous and next ones
 */

function attachPreviousAndNextTransactionIdentifiers(remote, dbinterface, notification_details, callback) {

  function countTransactions(callback) {
    transactions_lib.countAccountTransactionsInLedger(remote, dbinterface, {
      account: notification_details.account,
      ledger_index: notification_details.transaction.ledger_index
    }, callback);
  };

  function getNextTransactions(num_transactions_in_ledger, callback) {
    var steps = [
      {
        descending: true,
        num_transactions_in_ledger: num_transactions_in_ledger,
      },

      {
        descending: false,
        num_transactions_in_ledger: num_transactions_in_ledger
      }
    ]

    async.concat(steps, function(opts, concat_callback) {
      getPossibleNextTransactions(remote, dbinterface, notification_details, opts, concat_callback);
    }, callback);
  };

  function sortTransactions(all_possible_transactions, callback) {
    all_possible_transactions.push(notification_details.transaction);

    var possibilities = _.uniq(all_possible_transactions, function(tx) {
      return tx.hash;
    });

    possibilities.sort(function(a, b) {
      if (a.ledger_index === b.ledger_index) {
        return a.date <= b.date ? -1 : 1;
      } else {
        return a.ledger_index < b.ledger_index ? -1 : 1;
      }
    });

    callback(null, possibilities);
  };

  function prepareNotification(possibilities, callback) {
    var base_transaction_index = _.findIndex(possibilities, function(possibility) {
      if (notification_details.transaction.hash && possibility.hash === notification_details.transaction.hash) {
        return true;
      }

      if (notification_details.transaction.client_resource_id && possibility.client_resource_id === notification_details.transaction.client_resource_id) {
        return true;
      }

      return false;
    });

    if (base_transaction_index > 0) {
      var previous_transaction = possibilities[base_transaction_index - 1];
      notification_details.previous_transaction_identifier = (previous_transaction.from_local_db ? previous_transaction.client_resource_id : previous_transaction.hash);
      notification_details.previous_hash = previous_transaction.hash;
    }

    if (base_transaction_index + 1 < possibilities.length) {
      var next_transaction = possibilities[base_transaction_index + 1];
      notification_details.next_transaction_identifier = (next_transaction.from_local_db ? next_transaction.client_resource_id : next_transaction.hash);
      notification_details.next_hash = next_transaction.hash;
    }

    callback(null, notification_details);
  };

  var steps = [
    countTransactions,
    getNextTransactions,
    sortTransactions,
    prepareNotification
  ];

  async.waterfall(steps, callback);
};

/**
 *  Determine how many transactions the same account had in this one ledger
 *  then get one more than that number of transactions with either the
 *  ledger_index_min or ledger_index_max set to this ledger index
 */

function getPossibleNextTransactions($, notification_details, opts, callback) {
  var params = {
    account: notification_details.account,
    max: opts.num_transactions_in_ledger + 1,
    min: opts.num_transactions_in_ledger + 1
  };

  if (opts.descending) {
    params.descending = true;
    params.ledger_index_max = notification_details.transaction.ledger_index;
    params.ledger_index_min = -1;
  } else {
    params.descending = false;
    params.ledger_index_max = -1;
    params.ledger_index_min = notification_details.transaction.ledger_index;
  }

  transactions_lib.getAccountTransactions($, params, callback);
};

function parseNotificationFromTransaction(notification_details, opts, callback){
  if (typeof opts === 'function') {
    callback = opts;
    opts = transaction;
  }

  var transaction = notification_details.transaction || notification_details, 
    account = notification_details.account, 
    previous_transaction_identifier = notification_details.previous_transaction_identifier,
    next_transaction_identifier = notification_details.next_transaction_identifier,
    client_resource_id = notification_details.client_resource_id || opts.client_resource_id,
    types = opts.types;

  if (!transaction) {
    callback(null, null);
    return;
  }

  var notification = {
    account: '',
    type: '',
    direction: '',
    state: '',
    result: '',
    ledger: '',
    hash: '',
    timestamp: '',
    transaction_url: '',
    previous_hash: '',
    previous_notification_url: '',
    next_hash: '',
    next_notification_url: '',
    client_resource_id: ''
  };

  notification.account = account;

  if (transaction.Account) {
    if (account === transaction.Account) {
      notification.direction = 'outgoing';
    } else if (transaction.TransactionType === 'Payment' && transaction.Destination !== account) {
      notification.direction = 'passthrough';
    } else {
      notification.direction = 'incoming';
    }
  }

  if (transaction.hash) {
    notification.hash = transaction.hash;
  }

  if (client_resource_id) {
    notification.client_resource_id = client_resource_id;
  }

  if (transaction.TransactionType) {
    notification.type = transaction.TransactionType.toLowerCase();

    if (notification.type === 'payment') {
      notification.transaction_url = '/v1/accounts/' + notification.account + '/payments/' + (transaction.from_local_db ? notification.client_resource_id : notification.hash);
    } else {
      // TODO add support for lookup by client_resource_id for transaction endpoint
      notification.transaction_url = '/v1/transaction/' + notification.hash;
    }

    if (notification.type === 'offercreate' || notification.type === 'offercancel') {
      notification.type = 'order';
    }

    if (notification.type === 'trustset') {
      notification.type = 'trustline';
    }

    if (notification.type === 'accountset') {
      notification.type = 'account';
    }
  }

  if (transaction.ledger_index) {
    notification.ledger = '' + transaction.ledger_index;
  }

  if (next_transaction_identifier) {
    notification.next_notification_url = '/v1/accounts/' + notification.account + '/notifications/' + next_transaction_identifier + (types ? '?types=' + types.join(',') : '');
  }

  if (previous_transaction_identifier) {
    notification.previous_notification_url = '/v1/accounts/' + notification.account + '/notifications/' + previous_transaction_identifier + (types ? '?types=' + types.join(',') : '');
  }

  if (notification_details.previous_hash) {
    notification.previous_hash = notification_details.previous_hash;
  }

  if (notification_details.next_hash) {
    notification.next_hash = notification_details.next_hash;
  }

  if (transaction.date) {
    notification.timestamp = '' + new Date(transaction.date).toISOString();
  }

  if (transaction.meta) {
    notification.result = transaction.meta.TransactionResult;
  }

  if (transaction.state) {
    notification.state = transaction.state;
  } else {
    if (notification.result === 'tesSUCCESS') {
      notification.state = 'validated';
    } else if (notification.result) {
      notification.state = 'failed';
    }
  }

  callback(null, notification);
}
