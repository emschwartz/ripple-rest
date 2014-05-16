var _                = require('lodash');
var async            = require('async');
var bignum           = require('bignumber.js');
var ripple           = require('ripple-lib');
var validator        = require('../lib/schema-validator');
var transactions     = require('./transactions');
var serverLib        = require('../lib/server-lib');
var utils            = require('../lib/utils');

var DEFAULT_RESULTS_PER_PAGE = 10;

module.exports = {
  submit: submitPayment,
  get: getPayment,
  getBulkPayments: getBulkPayments,
  getPathFind: getPathFind
};

/**
 *  Submit a payment in the ripple-rest format.
 *
 *  If the payment is successful res.json will be called with
 *  a status_code of 200, the client_resource_id, and a status_url.
 *  Otherwise, most errors will be reported immediately with 400 or
 *  500 status codes, or submission errors will be passed to next
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {/config/config-loader} $.config
 *  @param {Payment} req.body.payment
 *  @param {String} req.body.secret
 *  @param {String} req.body.client_resource_id
 *  @param {Express.js Response} res
 *  @param {Express.js Next} next
 */
function submitPayment($, req, res, next) {
  var params = {
    payment: req.body.payment,
    secret: req.body.secret,
    client_resource_id: req.body.client_resource_id,
    url_base: req.protocol + '://' + req.host + ({ 80: ':80', 443:':443' }[$.config.get('PORT')] || '/')
  };

  function validateOptions(async_callback) {
    if (!params.payment) {
      return res.json(400, {
        success: false,
        message: 'Missing parameter: payment. Submission must have payment object in JSON form'
      });
    }

    if (!params.secret) {
      return res.json(400, {
        success: false,
        message: 'Missing parameter: secret. Submission must have account secret to sign and submit payment'
      });
    }

    if (!params.client_resource_id) {
      return res.json(400, {
        success: false,
        message: 'Missing parameter: client_resource_id. All payments must be submitted with a client_resource_id to prevent duplicate payments'
      });
    }

    if (!validator.isValid(params.client_resource_id, 'ResourceId')) {
      return res.json(400, {
        success: false,
        message: 'Invalid parameter: client_resource_id. Must be a string of ASCII-printable characters. Note that 256-bit hex strings are disallowed because of the potential confusion with transaction hashes.'
      });
    }

    async_callback();
  };

  function validatePayment(async_callback) {
    paymentIsValid(params.payment, function(err, payment){
      if (err) {
        res.json(400, { success: false, message: err.message || err });
      } else {
        async_callback();
      }
    });
  };

  function ensureConnected(async_callback) {
    serverLib.ensureConnected($.remote, function(err, connected) {
      if (connected) {
        async_callback();
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  function formatPayment(async_callback) {
    paymentToTransaction(params.payment, function(err, transaction) {
      if (err) {
        res.json(400, { success: false, message: err.message });
      } else {
        async_callback(null, transaction);
      }
    });
  };

  function submitTransaction(transaction, async_callback) {
    params.transaction = transaction;
    transactions.submit($, params, res, async_callback);
  };

  var steps = [
    validateOptions,
    validatePayment,
    ensureConnected,
    formatPayment,
    submitTransaction
  ];

  async.waterfall(steps, function(err, client_resource_id) {
    if (err) {
      next(err);
    } else {
      res.json(200, {
        success: true,
        client_resource_id: client_resource_id,
        status_url: '/v1/accounts/' + params.payment.source_account + '/payments/' + client_resource_id
      });
    }
  });
};

/**
 *  Retrieve the details of a particular payment from the Remote or
 *  the local database and return it in the ripple-rest Payment format.
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {RippleAddress} req.params.account
 *  @param {Hex-encoded String|ASCII printable character String} req.params.identifier
 *  @param {Express.js Response} res
 *  @param {Express.js Next} next
 */
function getPayment($, req, res, next) {
  var remote = $.remote;
  var dbinterface = $.dbinterface;

  var opts = {
    account: req.params.account,
    identifier: req.params.identifier
  };

  function validateOptions(callback) {
    if (!opts.account) {
      return res.json(400, { success: false, message: 'Missing parameter: account. ' +
        'Must provide account to get payment details' });
    }

    if (!validator.isValid(opts.account, 'RippleAddress')) {
      return res.json(400, { success: false, message: 'Invalid parameter: account. ' +
        'Must be a valid Ripple address' });
    }

    if (!opts.identifier) {
      return res.json(400, { success: false, messge: 'Missing parameter: hash or client_resource_id. ' +
        'Must provide transaction hash or client_resource_id to get payment details' });
    }

    var hasIdentifier = validator.isValid(opts.identifier, 'Hash256') || validator.isValid(opts.identifier, 'ResourceId')

    if (!hasIdentifier) {
      return res.json(400, { success: false, message: 'Invalid Parameter: hash or client_resource_id. ' +
        'Must provide a transaction hash or client_resource_id to get payment details' });
    }

    callback();
  };

  function ensureConnected(callback) {
    serverLib.ensureConnected(remote, function(err, connected) {
      if (connected) {
        async_callback();
      } else if (err) {
        res.json(500, { success: false, message: err.message });
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  // If the transaction was not in the outgoing_transactions db, get it from rippled
  function getTransaction(callback) {
    transactionsLib.getTransaction(remote, dbinterface, opts, callback);
  };

  function checkIsPayment(transaction, callback) {
    var isPayment = transaction && /^payment$/i.test(transaction.TransactionType);

    if (isPayment) {
      callback(null, transaction);
    } else {
      res.json(404, {
        success: false,
        message: 'Not a payment. The transaction corresponding to the given identifier is not a payment.'
      });
    }
  };

  function formatTransaction(transaction, callback) {
    if (transaction) {
      paymentformatter.parsePaymentFromTx(transaction, { account: opts.account }, callback);
    } else {
      res.json(404, {
        success: false,
        message: 'Payment Not Found. This may indicate that the payment was never validated and written into '
        + 'the Ripple ledger and it was not submitted through this ripple-rest instance. '
        + 'This error may also be seen if the databases of either ripple-rest '
        + 'or rippled were recently created or deleted.'
      });
    }
  };

  var steps = [
    validateOptions,
    ensureConnected,
    getTransaction,
    checkIsPayment,
    formatTransaction
  ];

  async.waterfall(steps, function(err, payment) {
    if (err) {
      next(err);
    } else {
      res.json({ success: true, payment: payment });
    }
  });
};

/**
 *  Retrieve the details of multiple payments from the Remote
 *  and the local database. 
 *
 *  This function calls transactions.getAccountTransactions
 *  recursively to retrieve results_per_page number of transactions
 *  and filters the results by type "payment", along with the other
 *  client-specified parameters.
 *
 *  @param {Remote} $.remote
 *  @param {/lib/db-interface} $.dbinterface
 *  @param {RippleAddress} req.params.account
 *  @param {RippleAddress} req.query.source_account
 *  @param {RippleAddress} req.query.destination_account
 *  @param {String} req.query.direction Possible values are "incoming", "outgoing"
 *  @param {Number} [-1] req.query.start_ledger
 *  @param {Number} [-1] req.query.end_ledger
 *  @param {Boolean} [false] req.query.earliest_first
 *  @param {Boolean} [false] req.query.exclude_failed
 *  @param {Number} [20] req.query.results_per_page
 *  @param {Number} [1] req.query.page
 *  @param {Express.js Response} res
 *  @param {Express.js Next} next
 */
function getBulkPayments($, req, res, next) {
  var remote = $.remote;
  var dbinterface = $.dbinterface;

  function getTransactions(callback) {
    transactionsLib.getAccountTransactions(remote, dbinterface, {
      account: req.params.account,
      source_account: req.query.source_account,
      destination_account: req.query.destination_account,
      direction: req.query.direction,
      ledger_index_min: req.query.start_ledger,
      ledger_index_max: req.query.end_ledger,
      descending: (req.query.earliest_first !== 'true'),
      exclude_failed: (req.query.exclude_failed === 'true'),
      min: req.query.results_per_page,
      max: req.query.results_per_page,
      offset: (req.query.results_per_page || DEFAULT_RESULTS_PER_PAGE) * ((req.query.page || 1) - 1),
      types: [ 'payment' ]
    }, callback);
  };

  function formatTransactions(transactions, callback) {
    async.map(transactions, function(transaction, map_callback) {
      paymentformatter.parsePaymentFromTx(transaction, { account: req.params.account }, map_callback);
    }, callback);
  };

  function attachResourceId(transactions, callback) {
    async.map(transactions, _.partial(attachClientResourceId, dbinterface), callback);
  };

  var steps = [
    getTransactions,
    formatTransactions,
    attachResourceId
  ];

  async.waterfall(steps, function(err, payments) {
    if (err) {
      next(err);
    } else {
      res.json({ success: true, payments: payments });
    }
  });
};



function getPathFind($, req, res, next) {
  var remote = $.remote;
  var dbinterface = $.dbinterface;

  var params = {
    source_account: req.params.account,
    source_currencies_string: req.param('source_currencies'),
    destination_account: req.params.destination_account,
    destination_amount_string: req.params.destination_amount_string,
  };

  function validateOptions(callback) {
    if (typeof params.source_currencies_string === 'string' && params.source_currencies_string.length >= 3) {
      params.source_currencies = params.source_currencies_string.split(',');
    }

    if (typeof params.destination_amount_string !== 'string' || params.destination_amount_string.length === 0) {
      return res.json(400, { success: false, message: 'Invalid Parameter: destination_amount. Must supply a string in the form value+currency+issuer' });
    }

    params.destination_amount_array = params.destination_amount_string.split('+');

    params.destination_amount = {
      value: params.destination_amount_array[0],
      currency: params.destination_amount_array[1],
      issuer: (params.destination_amount_array.length >= 3 ? params.destination_amount_array[2] : '')
    };

    callback();
  };

  function ensureConnected(callback) {
    serverLib.ensureConnected(remote, function(err, connected) {
      if (connected) {
        callback();
      } else {
        res.json(500, { success: false, message: 'No connection to rippled' });
      }
    });
  };

  // If the transaction was not in the outgoing_transactions db, get it from rippled
  function prepareOptions(callback) {
    parseParams(params, function(err, pathfind_params) {
      if (err) {
        res.json(400, { success: false, message: err.message });
      } else {
        callback(null, pathfind_params);
      }
    });
  };

  function findPath(pathfind_params, callback) {
    var request = remote.requestRipplePathFind(pathfind_params);

    request.once('error', callback);

    request.once('success', function(pathfind_results) {
      pathfind_results.source_account     = pathfind_params.src_account;
      pathfind_results.source_currencies  = pathfind_params.src_currencies;
      pathfind_results.destination_amount = pathfind_params.dst_amount;

      callback(null, pathfind_results);
    });

    function reconnectRippled() {
      remote.disconnect(function() {
        remote.connect();
      });
    };

    request.timeout(1000 * 20, function() {
      request.removeAllListeners();
      reconnectRippled();
      res.json(502, { success: false, message: 'Path request timeout' });
    });

    request.request();
  };

  function checkAddXRPPath(pathfind_results, callback) {
    // Check if we may need to add in the direct XRP path
    if (typeof pathfind_results.destination_amount === 'string' && (!pathfind_results.source_currencies || ~(params.source_currencies.indexOf('XRP')))) {
      addDirectXrpPath(remote, pathfind_results, callback);
    } else {
      callback(null, pathfind_results);
    }
  };

  function formatPath(pathfind_results, callback) {
    if (pathfind_results.alternatives && pathfind_results.alternatives.length > 0) {
      var payment_options = paymentformatter.parsePaymentsFromPathfind(pathfind_results);
      return callback(null, payment_options);
    }

    if (~pathfind_results.destination_currencies.indexOf(params.destination_amount.currency)) {
      res.json(404, { success: false, message: 'No paths found.' +
        'The destination_account does not accept ' +
        params.destination_amount.currency +
        ', they only accept: ' +
        pathfind_results.destination_currencies.join(', ') });
    } else if (pathfind_results.source_currencies &&
      pathfind_results.source_currencies.length > 0) {
      res.json(404, { success: false, message: 'No paths found.' +
        ' Please ensure that the source_account has sufficient funds to exectue' +
        ' the payment in one of the specified source_currencies. If it does' +
        ' there may be insufficient liquidity in the network to execute' +
        ' this payment right now' });
    } else {
      res.json(404, { success: false, message: 'No paths found.' +
        ' Please ensure that the source_account has sufficient funds to exectue' +
        ' the payment. If it does there may be insufficient liquidity in the' +
        ' network to execute this payment right now' });
    }
  };

  var steps = [
    validateOptions,
    ensureConnected,
    prepareOptions,
    findPath,
    checkAddXRPPath,
    formatPath
  ];

  async.waterfall(steps, function(err, payments) {
    if (err) {
      next(err);
    } else {
      res.json(200, { success: true, payments: payments });
    }
  });
};

function attachClientResourceId(dbinterface, payment, callback) {
  dbinterface.getTransaction({ hash: payment.hash }, function(err, db_entry) {
    if (err) {
      return callback(err);
    }

    var client_resource_id = '';

    if (db_entry && db_entry.client_resource_id) {
      client_resource_id = db_entry.client_resource_id;
    }

    callback(null, {
      client_resource_id: client_resource_id,
      payment: payment
    });
  });
};

function parseParams(params, callback) {
  var source_currencies = [ ];

  if (!validator.isValid(params.source_account, 'RippleAddress')) {
    return callback(new TypeError('Invalid parameter: source_account. Must be a valid Ripple address'));
  }

  if (!validator.isValid(params.destination_account, 'RippleAddress')) {
    return callback(new TypeError('Invalid parameter: destination_account. Must be a valid Ripple address'));
  }

  if (!validator.isValid(params.destination_amount, 'Amount')) {
    return callback(new TypeError('Invalid parameter: destination_amount. Must be an object of the form { value: \'1\', currency: \'XRP\', issuer: \' }'));
  }

  // Parse source currencies
  if (typeof params.source_currencies === 'object') {
    params.source_currencies.forEach(function(currency_string) {
      // Note that express middleware replaces '+' with ' ' in the query string

      if (/ /.test(currency_string)) {
        var currency_issuer_array = currency_string.split(' '),

        currency_object = {
          currency: currency_issuer_array[0],
          issuer: currency_issuer_array[1]
        };

        var validCurrency = validator.isValid(currency_object.currency, 'Currency')
                        || validator.isValid(currency_object.issuer, 'RippleAddress')

        if (!validCurrency) {
          return callback(new TypeError('Invalid parameter: source_currencies. Must be a list of valid currencies'));
        } else {
          source_currencies.push(currency_object);
        }
      } else {
        if (!validator.isValid(currency_string, 'Currency')) {
          return callback(new TypeError('Invalid parameter: source_currencies. Must be a list of valid currencies'));
        } else {
          source_currencies.push({ currency: currency_string });
        }
      }
    });
  }

  var pathfindParams = {
    src_account: params.source_account,
    dst_account: params.destination_account,
    dst_amount: (params.destination_amount.currency === 'XRP' ?
      utils.xrpToDrops(params.destination_amount.value) :
      params.destination_amount)
  };

  if (typeof pathfindParams.dst_amount === 'object' && !pathfindParams.dst_amount.issuer) {
    pathfindParams.dst_amount.issuer = pathfindParams.dst_account;
  }

  if (source_currencies.length > 0) {
    pathfindParams.src_currencies = source_currencies;
  }

  callback(null, pathfindParams);
};

/**
 *  Since ripple_path_find does not return XRP to XRP paths,
 *  add the direct XRP "path", if the source account has a sufficient balance
 *
 *  @param {Remote} remote
 *  @param {rippled Pathfind results} pathfind_results
 *  @param {Function} callback
 *
 *  @callback
 *  @param {Error} error
 *  @param {rippled Pathfind results with XRP path added} pathfind_results
 */
function addDirectXrpPath(remote, pathfind_results, callback) {
  // Check if destination_account accepts XRP
  if (~pathfind_results.destination_currencies.indexOf('XRP')) {
    return callback(null, pathfind_results);
  }

  // Check source_account balance
  remote.requestAccountInfo(pathfind_results.source_account, function(err, res) {
    if (err) {
      return callback(new Error('Cannot get account info for source_account. ' + err));
    }

    if (!res || !res.account_data || !res.account_data.Balance) {
      return callback(new Error('Internal Error. Malformed account info : ' + JSON.stringify(res)));
    }

    // Add XRP "path" only if the source_account has enough money to execute the payment
    if (bignum(res.account_data.Balance).greaterThan(pathfind_results.destination_amount)) {
      pathfind_results.alternatives.unshift({
        paths_canonical:  [ ],
        paths_computed:   [ ],
        source_amount:    pathfind_results.destination_amount
      });
    }

    callback(null, pathfind_results);
  });
};

function parsePaymentFromTx(tx, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  if (!opts.account) {
    callback(new Error('Internal Error. must supply opts.account'));
    return;
  }

  if (tx.TransactionType !== 'Payment') {
    callback(new Error('Not a payment. The transaction corresponding to the given identifier is not a payment.'));
    return;
  }

  var payment = {

    // User supplied
    source_account: tx.Account,
    source_tag: (tx.SourceTag ? '' + tx.SourceTag : ''),
    source_amount: (tx.SendMax ?
      (typeof tx.SendMax === 'object' ?
        tx.SendMax :
        {
          value: utils.dropsToXrp(tx.SendMax),
          currency: 'XRP',
          issuer: ''
        }) :
      (typeof tx.Amount === 'string' ?
        {
          value: utils.dropsToXrp(tx.Amount),
          currency: 'XRP',
          issuer: ''
        } :
        tx.Amount)),
    source_slippage: '0',

    destination_account: tx.Destination,
    destination_tag: (tx.DestinationTag ? '' + tx.DestinationTag : ''),
    destination_amount: (typeof tx.Amount === 'object' ?
      tx.Amount :
      {
        value: utils.dropsToXrp(tx.Amount),
        currency: 'XRP',
        issuer: ''
      }),

    // Advanced options
    invoice_id: tx.InvoiceID || '',
    paths: JSON.stringify(tx.Paths || []),
    no_direct_ripple: (tx.Flags & 0x00010000 ? true : false),
    partial_payment: (tx.Flags & 0x00020000 ? true : false),

    // Generated after validation
    direction: (opts.account ?
      (opts.account === tx.Account ?
        'outgoing' :
        (opts.account === tx.Destination ?
          'incoming' :
          'passthrough')) :
      ''),
    state: tx.state || (tx.meta.TransactionResult === 'tesSUCCESS' ? 'validated' : 'failed'),
    result: tx.meta.TransactionResult || '',
    ledger: '' + (tx.inLedger || tx.ledger_index),
    hash: tx.hash || '',
    timestamp: (tx.date ? new Date(ripple.utils.toTimestamp(tx.date)).toISOString() : ''),
    fee: utils.dropsToXrp(tx.Fee) || '',
    source_balance_changes: [],
    destination_balance_changes: []

  };

  // Add source_balance_changes
  utils.parseBalanceChanges(tx, tx.Account).forEach(function(amount){
    if (amount.value < 0) {
      payment.source_balance_changes.push(amount);
    }
  });

  // Add destination_balance_changes
  utils.parseBalanceChanges(tx, tx.Destination).forEach(function(amount){
    if (amount.value > 0) {
      payment.destination_balance_changes.push(amount);
    }
  });

  callback(null, payment);
};

/**
 *  
 *
 *
 *
 */
function paymentIsValid(payment, callback) {
  // Ripple addresses
  if (!validator.isValid(payment.source_account, 'RippleAddress')) {
    callback(new TypeError('Invalid parameter: source_account. Must be a valid Ripple address'));
    return;
  }
  if (!validator.isValid(payment.destination_account, 'RippleAddress')) {
    callback(new TypeError('Invalid parameter: destination_account. Must be a valid Ripple address'));
    return;
  }

  // Tags
  if (payment.source_tag && (!validator.isValid(payment.source_tag, 'UINT32'))) {
    callback(new TypeError('Invalid parameter: source_tag. Must be a string representation of an unsiged 32-bit integer'));
    return;
  }
  if (payment.destination_tag && (!validator.isValid(payment.destination_tag, 'UINT32'))) {
    callback(new TypeError('Invalid parameter: destination_tag. Must be a string representation of an unsiged 32-bit integer'));
    return;
  }

  // Amounts
  // destination_amount is required, source_amount is optional
  if (!payment.destination_amount || (!validator.isValid(payment.destination_amount, 'Amount'))) {
    callback(new TypeError('Invalid parameter: destination_amount. Must be a valid Amount object'));
    return;
  }
  if (payment.source_amount && (!validator.isValid(payment.source_amount, 'Amount'))) {
    callback(new TypeError('Invalid parameter: source_amount. Must be a valid Amount object'));
    return;
  }

  // No issuer for XRP
  if (payment.destination_amount && payment.destination_amount.currency.toUpperCase() === 'XRP' && payment.destination_amount.issuer) {
    callback(new TypeError('Invalid parameter: destination_amount. XRP cannot have issuer'));
    return;
  }
  if (payment.source_amount && payment.source_amount.currency.toUpperCase() === 'XRP' && payment.source_amount.issuer) {
    callback(new TypeError('Invalid parameter: source_amount. XRP cannot have issuer'));
    return;
  }


  // Slippage
  if (payment.source_slippage && !validator.isValid(payment.source_slippage, 'FloatString')) {
    callback(new TypeError('Invalid parameter: source_slippage. Must be a valid FloatString'));
    return;
  }


  // Advanced options
  if (payment.invoice_id && !validator.isValid(payment.invoice_id, 'Hash256')) {
    callback(new TypeError('Invalid parameter: invoice_id. Must be a valid Hash256'));
    return;
  }
  if (payment.paths) {
    if (typeof payment.paths === 'string') {
      try {
        JSON.parse(payment.paths);
      } catch (e) {
        callback(new TypeError('Invalid parameter: paths. Must be a valid JSON string or object'));
        return;
      }
    } else if (typeof payment.paths === 'object') {
      try {
        JSON.parse(JSON.stringify(payment.paths));
      } catch (e) {
        callback(new TypeError('Invalid parameter: paths. Must be a valid JSON string or object'));
        return;
      }
    }
  }
  if (payment.hasOwnProperty('partial_payment') && typeof payment.partial_payment !== 'boolean') {
    callback(new TypeError('Invalid parameter: partial_payment. Must be a boolean'));
    return;
  }
  if (payment.hasOwnProperty('no_direct_ripple') && typeof payment.no_direct_ripple !== 'boolean') {
    callback(new TypeError('Invalid parameter: no_direct_ripple. Must be a boolean'));
    return;
  }

  callback(null, true);
};

function paymentToTransaction(payment, callback) {
  // Validate Input
  try {
    // Convert blank issuer to sender's address (Ripple convention for 'any issuer')
    if (payment.source_amount && payment.source_amount.currency !== 'XRP' && payment.source_amount.issuer === '') {
      payment.source_amount.issuer = payment.source_account;
    }
    if (payment.destination_amount && payment.destination_amount.currency !== 'XRP' && payment.destination_amount.issuer === '') {
      payment.destination_amount.issuer = payment.destination_account;
    }

    // Uppercase currency codes
    if (payment.source_amount) {
      payment.source_amount.currency = payment.source_amount.currency.toUpperCase();
    }
    if (payment.destination_amount) {
      payment.destination_amount.currency = payment.destination_amount.currency.toUpperCase();
    }

    /* Construct payment */
    var transaction = new ripple.Transaction(),
    transaction_data = {
      from: payment.source_account,
      to: payment.destination_account
    };

    if (payment.destination_amount.currency === 'XRP') {
      transaction_data.amount = utils.xrpToDrops(payment.destination_amount.value);
    } else {
      transaction_data.amount = payment.destination_amount;
    }

    if (payment.invoice_id) {
      transaction_data.invoiceID = payment.invoice_id;
    }

    transaction.payment(transaction_data);

    // Tags
    if (payment.source_tag) {
      transaction.sourceTag(parseInt(payment.source_tag, 10));
    }
    if (payment.destination_tag) {
      transaction.destinationTag(parseInt(payment.destination_tag, 10));
    }

    // SendMax
    if (payment.source_amount) {
      // Only set send max if source and destination currencies are different
      if (!(payment.source_amount.currency === payment.destination_amount.currency && payment.source_amount.issuer === payment.source_amount.issuer)) {

        var max_value = bignum(payment.source_amount.value).plus(payment.source_slippage).toString();

        if (payment.source_amount.currency === 'XRP') {
          transaction.sendMax(utils.xrpToDrops(max_value));
        } else {
          transaction.sendMax({
            value: max_value,
            currency: source_amount.currency,
            issuer: source_amount.issuer
          });
        }
      }
    }

    // Paths
    if (typeof payment.paths === 'string') {
      transaction.paths(JSON.parse(payment.paths));
    } else if (typeof payment.paths === 'object') {
      transaction.paths(payment.paths);
    }

    // Flags
    var flags = [];
    if (payment.partial_payment) {
      flags.push('PartialPayment');
    }
    if (payment.no_direct_ripple) {
      flags.push('NoRippleDirect');
    }
    if (flags.length > 0) {
      transaction.setFlags(flags);
    }

  } catch (e) {
    return callback(e);
  }

  callback(null, transaction);
};

/**
 *  Convert the pathfind results returned from rippled into an
 *  array of payments in the ripple-rest format. The client should be 
 *  able to submit any of the payments in the array back to ripple-rest.
 *
 *  @param {rippled Pathfind results} pathfind_resultsults
 *  @param {Amount} opts.destination_amount Since this is not returned by rippled in the pathfind results it can either be added to the results or included in the opts here
 *  @param {RippleAddress} opts.source_account Since this is not returned by rippled in the pathfind results it can either be added to the results or included in the opts here
 *  
 *  @returns {Array of Payments} payments
 */
function parsePaymentsFromPathfind(pathfind_resultsults, opts) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  if (opts && opts.destination_amount) {
    pathfind_resultsults.destination_amount = opts.destination_amount;
  }

  if (opts && opts.source_account) {
    pathfind_resultsults.source_account = opts.source_account;
  }

  var payments = [];

  pathfind_resultsults.alternatives.forEach(function(alternative){

    var payment = {
      source_account: pathfind_resultsults.source_account,
      source_tag: '',
      source_amount: (typeof alternative.source_amount === 'string' ?
      {
        value: utils.dropsToXrp(alternative.source_amount),
        currency: 'XRP',
        issuer: ''
      } :
      {
        value: alternative.source_amount.value,
        currency: alternative.source_amount.currency,
        issuer: (alternative.source_amount.issuer === pathfind_resultsults.source_account ? 
          '' : 
          alternative.source_amount.issuer)
      }),
      source_slippage: '0',
      destination_account: pathfind_resultsults.destination_account,
      destination_tag: '',
      destination_amount: (typeof pathfind_resultsults.destination_amount === 'string' ?
        {
          value: utils.dropsToXrp(pathfind_resultsults.destination_amount),
          currency: 'XRP',
          issuer: ''
        } :
        {
          value: pathfind_resultsults.destination_amount.value,
          currency: pathfind_resultsults.destination_amount.currency,
          issuer: (pathfind_resultsults.destination_amount.issuer === pathfind_resultsults.destination_account ?
            '' :
            pathfind_resultsults.destination_amount.issuer)
        }),
      invoice_id: '',
      paths: JSON.stringify(alternative.paths_computed),
      partial_payment: false,
      no_direct_ripple: false
    };

    payments.push(payment);

  });

  return payments;
};

