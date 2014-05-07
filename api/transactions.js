var _          = require('lodash');
var async      = require('async');
var ripple     = require('ripple-lib');
var server_lib = require('../lib/server-lib');
var validator  = require('../lib/schema-validator');

module.exports = {

  DEFAULT_RESULTS_PER_PAGE: 10,
  NUM_TRANSACTION_TYPES: 5,
  DEFAULT_LEDGER_BUFFER: 6,

  submit: submitTransaction,
  get: getTransaction,
  getTransactionHelper: getTransactionHelper,
  getAccountTransactions: getAccountTransactions

};

/**
 *  Submit a normal ripple-lib transaction, blocking duplicates
 *  for payments and orders.
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {Transaction} data.transaction
 *  @param {String} data.secret
 *  @param {String} data.client_resource_id
 *  @param {Express.js Response} res Used to send error messages directly to the client
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error Submission Error
 *  @param {submission response} response The response received from the 'proposed' event
 */
function submitTransaction($, data, res, callback) {

  function ensureConnected(async_callback) {
    server_lib.ensureConnected($.remote, function(err, connected) {
      if (connected) {
        async_callback();
      } else if (err) {
        res.json(500, { success: false, message: err.message });
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  function prepareTransaction(async_callback) {
    // Secret is stored in transaction object, not in ripple-lib Remote
    // Note that transactions submitted with incorrect secrets will be passed
    // to rippled, which will respond with a 'temBAD_AUTH_MASTER' error
    // TODO: locally verify that the secret corresponds to the given account
    data.transaction.secret(data.secret);
    data.transaction.clientID(data.client_resource_id);

    async_callback(null, data.transaction);
  };

  function blockDuplicates(transaction, async_callback) {    
    // Block duplicate payments and orders
    // Don't block other transaction types because the clients may use a specific
    // client_resource_id to identify a particular trustline or account settings resource
    // instead of a particular "transaction" to change one of those resources 
    var type = transaction.tx_json.TransactionType;
    if (type !== 'Payment' && type !== 'OfferCreate' && type !== 'OfferCancel') {
      return async_callback(null, transaction);
    }

    $.dbinterface.getTransaction({
      source_account: transaction.tx_json.Account,
      client_resource_id: data.client_resource_id,
      type: transaction.tx_json.TransactionType.toLowerCase()
    }, function(err, db_record) {
        if (err) {
          return async_callback(err);
        }

        // Don't block resubmissions of failed transactions
        if (db_record && db_record.state !== 'failed') {
          res.json(500, { success: false, message: 'Duplicate Transaction. ' +
            'A record already exists in the database for a transaction of this type ' +
            'with the same client_resource_id. If this was not an accidental resubmission ' +
            'please submit the transaction again with a unique client_resource_id' });
        } else {
          async_callback(null, transaction);
        }
    });
  };

  function submitTransaction(transaction, async_callback) {
    transaction.remote = $.remote;
    transaction.lastLedger(Number($.remote._ledger_current_index) + module.exports.DEFAULT_LEDGER_BUFFER);

    transaction.once('error', async_callback);

    // The 'proposed' event is fired when ripple-lib receives an initial tesSUCCESS response from
    // rippled. This does not guarantee that the transaction will be validated but it is at this
    // point that we want to respond to the user that the transaction has been submitted
    transaction.once('proposed', function() {
      async_callback(null, transaction._clientID);
    });

    // Note that ripple-lib saves the transaction to the db throughout the submission process
    // using the persistence functions passed to the ripple-lib Remote instance
    transaction.submit();
  };

  var steps = [
    ensureConnected,
    prepareTransaction,
    blockDuplicates,
    submitTransaction
  ];

  async.waterfall(steps, callback);
};

/**
 *  Wrapper around getTransactionHelper function that is
 *  meant to be used directly as a client-facing function.
 *  Unlike getTransactionHelper, it will call next with any errors
 *  and send a JSON response to the client on success.
 *
 *  See getTransactionHelper for parameter details
 */
function getTransaction($, req, res, next) {
  getTransactionHelper($, req, res, function(err, transaction) {
    if (err) {
      next(err);
    } else {
      res.json(200, { success: true, transaction: transaction });
    }
  });
};

/**
 *  Retrieve a transaction from the Remote and local database
 *  based on the account and either hash or client_resource_id.
 *
 *  Note that if any errors are encountered while executing this function
 *  they will be sent back to the client through the res. If the query is
 *  successful it will be passed to the callback function which can either
 *  send the transaction directly back to the client (e.g. in the case of
 *  getTransaction) or can process the transaction more (e.g. in the case
 *  of the Notification or Payment related functions).
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {RippleAddress} req.params.account
 *  @param {Hex-encoded String|ASCII printable character String} req.params.identifier
 *  @param {Express.js Response} res
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Transaction} transaction
 */
function getTransactionHelper($, req, res, callback) {
  var opts = $.opts || {
    account: req.params.account,
    identifier: req.params.identifier
  };

  function validateOptions(async_callback) {
    if (!opts.identifier) {
      res.json(400, { success: false, message: 'Missing parameter: identifier' });
    } else if (validator.isValid(opts.identifier, 'Hash256')) {
      opts.hash = opts.identifier;
      async_callback();
    } else if (validator.isValid(opts.identifier, 'ResourceId')) {
      opts.client_resource_id = opts.identifier;
      async_callback();
    } else {
      res.json(400, { success: false, message: 'Parameter not a valid transaction hash or client_resource_id: identifier' });
    }
  };

  function ensureConnected(async_callback) {
    server_lib.ensureConnected($.remote, function(err, connected){
      if (connected) {
        async_callback();
      } else if (err) {
        res.json(500, { success: false, message: err.message });
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  function queryTransaction(async_callback) {
    $.dbinterface.getTransaction(opts, function(err, entry) {
      if (err) {
        return async_callback(err);
      }

      if (entry && entry.transaction) {
        async_callback(null, entry.transaction);
      } else if (entry) {
        $.remote.requestTx(entry.hash, async_callback);
      } else if (opts.hash) {
        $.remote.requestTx(opts.hash, async_callback);
      } else {
        res.json(404, { success: false, message: 'Transaction not found' });
      }
    });
  };

  function checkIfRelatedToAccount(transaction, async_callback) {

    if (opts.account) {
      var transaction_string = JSON.stringify(transaction);
      var account_regex = new RegExp(opts.account);
      if (!account_regex.test(transaction_string)) {
        return res.json(400, { success: false, message: 'Transaction specified did not affect the given account' });
      }
    }

    async_callback(null, transaction);
  };

  function attachResourceID(transaction, async_callback) {
    if (transaction && opts.client_resource_id) {
      transaction.client_resource_id = opts.client_resource_id;
    }
    async_callback(null, transaction);
  };

  function attachDate(transaction, async_callback) {
    if (!transaction || transaction.date || !transaction.ledger_index) {
      return async_callback(null, transaction);
    }

    // Get ledger containing the transaction to determine date
    $.remote.requestLedger(transaction.ledger_index, function(err, res) {
      if (err) {
        return res.json(404, { success: false, message: 'Transaction ledger not found' });
      }

      if (typeof res.ledger.close_time === 'number') {
        transaction.date = ripple.utils.time.fromRipple(res.ledger.close_time);
      }

      async_callback(null, transaction);
    });
  };

  var steps = [
    validateOptions,
    ensureConnected,
    queryTransaction,
    checkIfRelatedToAccount,
    attachResourceID,
    attachDate
  ];

  async.waterfall(steps, callback);
};

/**
 *  Recursively get transactions for the specified account from 
 *  the Remote and local database. If opts.min is set, this will
 *  recurse until it has retrieved that number of transactions or
 *  it has reached the end of the account's transaction history.
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {RippleAddress} opts.account
 *  @param {Number} [-1] opts.ledger_index_min
 *  @param {Number} [-1] opts.ledger_index_max
 *  @param {Boolean} [true] opts.descending
 *  @param {Boolean} [false] opts.binary
 *  @param {opaque value} opts.marker
 *  @param {Express.js Response} res
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Array of transactions in JSON format} transactions
 */
function getAccountTransactions($, opts, res, callback, previous_transactions) {
  if (!opts.max) {
    opts.max = module.exports.DEFAULT_RESULTS_PER_PAGE;
  }

  if (!opts.min) {
    opts.min = module.exports.DEFAULT_RESULTS_PER_PAGE;
  }

  // Limit will be set if this function is called recursively
  if (!opts.limit) {
    if (opts.types && opts.types.length < module.exports.NUM_TRANSACTION_TYPES) {
      opts.limit = 2 * Math.max(opts.max, module.exports.DEFAULT_RESULTS_PER_PAGE);
    } else {
      opts.limit = opts.max;
    }
  }

  function ensureConnected(async_callback) {
    server_lib.ensureConnected($.remote, function(err, connected){
      if (connected) {
        async_callback();
      } else if (err) {
        res.json(500, { success: false, message: err.message });
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  function queryTransactions(connected, async_callback) {
    getLocalAndRemoteTransactions($, opts, async_callback);
  };

  function filterTransactions(transactions, async_callback) {
    // Filter results so that they are unique and match the given parameters
    async_callback(null, transactionFilter(transactions, opts));
  };

  function sortTransactions(transactions, async_callback) {
    transactions.sort(function(first, second) {
      return compareTransactions(first, second, opts.descending);
    });

    async_callback(null, transactions);
  };

  function mergeAndTruncateResults(transactions, async_callback) {
    // Combine transactions with previous_transactions from previous
    // recursive call of this function
    if (previous_transactions && previous_transactions.length > 0) {
      transactions = previous_transactions.concat(transactions);
    }

    // Handle offset
    if (opts.offset && opts.offset > 0) {
      var offset_remaining = opts.offset - transactions.length;
      transactions = transactions.slice(opts.offset);
      opts.offset = offset_remaining;
    }

    // Truncate results if there are too many
    if (transactions.length > opts.max) {
      transactions = transactions.slice(0, opts.max);
    }

    async_callback(null, transactions);
  };

  var steps = [
    ensureConnected,
    queryTransactions,
    filterTransactions,
    sortTransactions,
    mergeAndTruncateResults
  ];

  async.waterfall(steps, function(err, transactions) {
    if (err) {
      return callback(err);
    }

    // If there are enough transactions, send them back to the client
    // Otherwise recurse
    if (!opts.min || transactions.length >= opts.min || !opts.marker) {

      callback(null, transactions);

    } else {

      setImmediate(function() {
        getAccountTransactions(remote, dbinterface, opts, callback, transactions);
      });

    }
  });
};

/**
 *  Retrieve transactions from the Remote as well as the local database.
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {RippleAddress} opts.account
 *  @param {Number} [-1] opts.ledger_index_min
 *  @param {Number} [-1] opts.ledger_index_max
 *  @param {Boolean} [true] opts.descending
 *  @param {Boolean} [false] opts.binary
 *  @param {opaque value} opts.marker
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Array of transactions in JSON format} transactions
 */
function getLocalAndRemoteTransactions($, opts, callback) {

  function queryRippled(callback) {
    getAccountTx(remote, opts, function(err, results) {
      if (err) {
        callback(err);
      } else {
        // Set marker so that when this function is called again
        // recursively it starts from the last place it left off
        opts.marker = results.marker;

        callback(null, results.transactions);
      }
    });
  };

  function queryDB(callback) {
    if (opts.exclude_failed) {
      callback(null, [ ]);
    } else {
      dbinterface.getFailedTransactions(opts, callback);
    }
  };

  var transaction_sources = [ 
    queryRippled, 
    queryDB 
  ];

  async.parallel(transaction_sources, function(err, results) {
    if (err) {
      return callback(err);
    }

    var results = results[0].concat(results[1]);
    var transactions = _.uniq(results, function(tx) {
      return tx.hash;
    });

    callback(null, transactions);
  });
};

/**
 *  Filter transactions based on the given set of options.
 *  
 *  @param {Array of transactions in JSON format} transactions
 *  @param {Boolean} [true] opts.exclude_failed
 *  @param {Array of Strings} opts.types Possible values are "payment", "offercreate", "offercancel", "trustset", "accountset"
 *  @param {RippleAddress} opts.source_account
 *  @param {RippleAddress} opts.destination_account
 *  @param {String} opts.direction Possible values are "incoming", "outgoing"
 *
 *  @returns {Array of transactions in JSON format} filtered_transactions
 */
function transactionFilter(transactions, opts) {
  var filtered_transactions = transactions.filter(function(transaction) {
    if (opts.exclude_failed) {
      if (transaction.state === 'failed' || (transaction.meta && transaction.meta.TransactionResult !== 'tesSUCCESS')) {
        return false;
      }
    }

    if (opts.types && opts.types.length > 0) {
      if (opts.types.indexOf(transaction.TransactionType.toLowerCase()) === -1) {
        return false;
      }
    }

    if (opts.source_account) {
      if (transaction.Account !== opts.source_account) {
        return false;
      }
    }

    if (opts.destination_account) {
      if (transaction.Destination !== opts.destination_account) {
        return false;
      }
    }

    if (opts.direction) {
      if (opts.direction === 'outgoing' && transaction.Account !== opts.account) {
        return false;
      }
      if (opts.direction === 'incoming' && transaction.Destination && transaction.Destination !== opts.account) {
        return false;
      }
    }

    return true;
  });

  return filtered_transactions;
};

/**
 *  Order two transactions based on their ledger_index and date
 *
 *  @param {transaction in JSON format} first
 *  @param {transaction in JSON format} second
 *  @param {Boolean} [false] descending
 */
function compareTransactions(first, second, descending) {
  var first_index = first.ledger || first.ledger_index;
  var second_index = second.ledger || second.ledger_index;
  var first_less_than_second = true;

  if (first_index === second_index) {
    if (first.date <= second.date) {
      first_less_than_second = true;
    } else {
      first_less_than_second = false;
    }
  } else if (first_index < second_index) {
    first_less_than_second = true;
  } else {
    first_less_than_second = false;
  }

  // If the results are meant to be descending, swap this value
  if (descending) {
    first_less_than_second = !first_less_than_second;
  }

  if (first_less_than_second) {
    return -1;
  } else {
    return 1;
  }
};

/**
 *  Wrapper around the standard ripple-lib requestAccountTx function
 *
 *  @param {Remote} remote
 *  @param {RippleAddress} opts.account
 *  @param {Number} [-1] opts.ledger_index_min
 *  @param {Number} [-1] opts.ledger_index_max
 *  @param {Boolean} [true] opts.descending
 *  @param {Boolean} [false] opts.binary
 *  @param {opaque value} opts.marker
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {Array of transactions in JSON format} response.transactions
 *  @param {opaque value} response.marker
 */
function getAccountTx(remote, opts, callback) {
  var params = {
    account: opts.account,
    ledger_index_min: opts.ledger_index_min || opts.ledger_index || -1,
    ledger_index_max: opts.ledger_index_max || opts.ledger_index || -1,
    limit: opts.limit || DEFAULT_RESULTS_PER_PAGE,
    forward: (opts.hasOwnProperty('descending') ? !opts.descending : true),
    marker: opts.marker
  };

  if (opts.binary) {
    params.binary = true;
  }

  remote.requestAccountTx(params, function(err, account_tx_results) {
    if (err) {
      return callback(err);
    }

    var transactions = [ ];

    account_tx_results.transactions.forEach(function(tx_entry) {
      if (!tx_entry.validated) return;
      var tx = tx_entry.tx;
      tx.meta = tx_entry.meta;
      transactions.push(tx);
    });

    callback(null, {
      transactions: transactions,
      marker: account_tx_results.marker
    });
  });
};
