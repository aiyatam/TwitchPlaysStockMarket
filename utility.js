'use strict';
var CONSTANTS = require('./constants.js');
//var VALID_EXCHANGES = CONSTANTS.VALID_EXCHANGES;
var COMMANDS = CONSTANTS.COMMANDS;
var ACTIONS = CONSTANTS.ACTIONS;
var ERROR_MESSAGE = CONSTANTS.ERROR_MESSAGE;
var INVALID_TICKER_MESSAGE = CONSTANTS.INVALID_TICKER_MESSAGE;
var LOW_VOLUME_MESSAGE = CONSTANTS.LOW_VOLUME_MESSAGE;
var HELP_MESSAGE = CONSTANTS.HELP_MESSAGE;


var utils = {
    botAction: botAction,
    compareHoldings: compareHoldings,
    holdingValue: holdingValue,
    parseMessage: function (message) {
        console.log('parseMessage', message);
        if (message && message.charAt(0) === '!') {
            var tokens = message.toLowerCase().split(/\s/);
            var command = tokens[0].substr(1);

            switch (command) {
            case COMMANDS.HELP:
                return HELP_MESSAGE;

            case COMMANDS.BUY:
            case COMMANDS.SELL:
                var ticker = tokens[1];
                var quantity = parseInt(tokens[2]);
                var action = tokens[3];

                switch (action) {
                case ACTIONS.MARKET:
                    return executeMarketOrder(command,
                                              ticker,
                                              quantity);
                case ACTIONS.LIMIT:
                    var strike = parseDouble(tokens[4]);
                    return 'Limit orders are not currently supported';

                default:
                    console.log('Invalid action', action);
                    return ERROR_MESSAGE;
                }
                break;

            case COMMANDS.QUOTE:
                var ticker = tokens[1];
                return getQuote(ticker);

            case COMMANDS.PORTFOLIO:
                return displayHoldings();

            case COMMANDS.BOT:
                var botCommand = tokens[1];
                return botAction(botCommand);

            default:
                console.log('Invalid command', command);
                return ERROR_MESSAGE;
            }
        }
    }
};

function displayHoldings() {
    var str = 'cash: ' + utils.data.cash + ', holdings: [';

    var hasHoldings = false;
    for (var x in utils.data.holdings) {
        str += x + ': ' + utils.data.holdings[x] + ', ';
        hasHoldings = true;
    }

    if (hasHoldings) {
        str = str.substr(0, str.length - 2);
    }

    str += ']';
    return str;
}

function getPrice(ticker) {
    return utils.DATA_SERVICE.getNext(ticker);
}

function getName(ticker) {
    return utils.DATA_SERVICE.getName(ticker);
}

function formatPrice(price) {
    return '$' + price.toFixed(2);
}

function executeMarketOrder(command, ticker, quantity) {
    var data = utils.data;
    var price = getPrice(ticker);

    if (!getName(ticker)) {
        console.log('Invalid ticker - does not exist');
        return INVALID_TICKER_MESSAGE;
    }

    if (isNaN(price)) {
        console.log('NaN error. Price:', price);
        return LOW_VOLUME_MESSAGE;
    }

    if (isNaN(quantity)) {
        console.log('NaN error. Quantity:', quantity);
        return ERROR_MESSAGE;
    }

    var pastVerb, multiplier;
    if (command === COMMANDS.BUY) {
        if (price * quantity > data.cash) {
            return 'Insufficient funds';
        }
        multiplier = 1;
        pastVerb = 'Bought';
    }
    else if (command === COMMANDS.SELL) {
        if (!data.holdings[ticker]
            || quantity > data.holdings[ticker]) {
            return 'Insufficient holdings';
        }
        multiplier = -1;
        pastVerb = 'Sold';
    }

    data.cash -= price * quantity * multiplier;
    if (!data.holdings[ticker]) {
        data.holdings[ticker] = 0;
    }
    data.holdings[ticker] += quantity * multiplier;
    return pastVerb + ' ' + quantity + ' shares of ' +
        ticker.toUpperCase() + ' for ' + formatPrice(price) + ' each';
}

function getQuote(ticker) {
    var price = getPrice(ticker);

    if (!getName(ticker)) {
        console.log('Invalid ticker - does not exist');
        return INVALID_TICKER_MESSAGE;
    }

    if (isNaN(price)) {
        console.log('NaN error. Price:', price);
        return LOW_VOLUME_MESSAGE;
    }

    return price;
}

function holdingValue (x) {
    var price = x.price[x.price.length - 1];
    var qty = x.quantity;
    return price * qty;
}

function compareHoldings (a, b) {
    if (a.holdingValue < b.holdingValue) {
        return -1;
    } else if (a.holdingValue > b.holdingValue) {
        return 1;
    } else {
        return 0;
    }
}

function botAction(cmd) {
    switch (cmd) {
        case 'off':
            if (utils.botControl) {
                utils.botControl.map(function (botController) {
                    clearInterval(botController);
                });
                utils.botControl = null;
                return 'Bots OFFLINE.';
            } else {
                return 'Bots are already offline.';
            }
        case 'on':
            if (!utils.botControl) {
                console.log('starting bots...');
                utils.botControl = utils.bots.map(function (bot) {
                    return setInterval(utils.runBot, CONSTANTS.BOT_UPD_INTERVAL, bot);
                });
                return 'Bots ONLINE.';
            } else {
                return 'Bots are already online.';
            }
        default:
            return 'Invalid bot command.';
    }
}

module.exports = utils;
