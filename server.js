'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var _ = require('lodash');

var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var utils = require('./utility.js');
var DATA_SERVICE = require('./getData.js');
var POKEMON = require('./pokenames.js');

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

// interval (milliseconds) for updating frontend
// var DATA_UPD_INTERVAL = 3000;

// starting cash for the portfolio
var START_CASH = 100000;

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'Angular', 'images', 'pikachu.png')));
app.use(logger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'Angular')));

// share an object of the data
var data = {
    initialValue: START_CASH,
    cash: START_CASH,
    holdings: {}
};
utils.data = data;
utils.DATA_SERVICE = DATA_SERVICE;

// app.use('/', routes);
// app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

function toProperCase(mName) {
    return mName.charAt(0).toUpperCase() + mName.substring(1);
}

function handleChat(chatJSON) {
    var chat = JSON.parse(chatJSON);
    io.emit('chat message', chat.userid + ': ' + chat.msg);
    var result = utils.parseMessage(chat.msg);
    if (result) {
        io.emit('chat message', result);
    }
}

function chatServer(app) {
    io.on('connection', function(socket) {
        var username = toProperCase(_.sample(POKEMON.adjs)) + _.sample(POKEMON.pokemon);
        console.log(username + ' connected');
        socket.emit('userid', username);
        socket.on('chat message', handleChat);
    });

    console.log('chat server started.');
}
chatServer(app);


// Market Data Feed


/*
function emitData() {
    var N_DATA_PTS = 50;
    var slugData = {
        cash: data.cash,
        initialValue: data.initialValue
    };

    var holdings = [];
    for (var holdingTick in data.holdings) {
        // returns value, but just need to advance pointer
        DATA_SERVICE.getNext(holdingTick);

        // assemble holding object
        var holding = {
            ticker: holdingTick,
            name: DATA_SERVICE.getName(holdingTick),
            price: DATA_SERVICE.getLastN(holdingTick, N_DATA_PTS),
            quantity: data.holdings[holdingTick],
        };
        holding.holdingValue = utils.holdingValue(holding);
        if (holding.quantity != 0) {
            holdings.push(holding);
        }
    }

    holdings.sort(utils.compareHoldings);
    var holdingsValue = holdings.reduce(function(accum, x) {
            return accum + x.holdingValue;
        }, 0);
    slugData.portfolioValue = holdingsValue + slugData.cash;
    slugData.holdings = holdings;

    var slug = JSON.stringify(slugData);
    io.emit('portfolio data', slug);

}
*/

function runBot(opts) {
    if (Math.random() < opts.loudness) {
        var actions = ['buy', 'sell'];
        var tickers = ['TWTR', 'AAPL', 'JPM', 'GRPN', 'YHOO',
                   'TSLA', 'KO', 'GOOG', 'FB', 'YELP',
                   'C', 'BAC', 'UBS', 'KRFT', 'ETFC'];
        var orderTypes = ['mkt'];

        var action = _.sample(actions);
        var ticker = _.sample(tickers);
        var orderType = _.sample(orderTypes);
        var qty = _.random(100) * 5;
        var msg = '!' + action + ' ' + ticker + ' ' + qty + ' ' + orderType;
        msg = JSON.stringify({msg: msg, userid: opts.name});
        handleChat(msg);
    }
}

// var dataFeed = setInterval(emitData, DATA_UPD_INTERVAL);  // Emit data
var bot1 = {name: toProperCase(_.sample(POKEMON.adjs)) + 'Mew',
             loudness: 0.3};
var bot2 = {name: toProperCase(_.sample(POKEMON.adjs)) + 'Mew',
             loudness: 0.35};

var bots = [bot1, bot2];
utils.bots = bots;
utils.runBot = runBot;
utils.botAction('on');


http.listen(server_port, server_ip_address, function() {
    console.log('main server started.');
});
