/**
 * Create a stripped websocket-server using the sample code from:
 * https://github.com/Worlize/WebSocket-Node#server-example
 *
 */

var port = //CHANGEMETOYOURPORTNAME;
var broadcastTo = [];
var usernames = [];

// Require the modules we need
var WebSocketServer = require('websocket').server;
var http = require('http');



/**
 * Create a http server with a callback for each request
  *
  */
var httpServer = http.createServer(function (request, response) {
    'use strict';
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(200, {'Content-type': 'text/plain'});
    response.end('Hello world\n');
}).listen(port, function () {
    'use strict';
    console.log((new Date()) + ' HTTP server is listening on port ' + port);
});



/**
 * Create an object for the websocket
 * https://github.com/Worlize/WebSocket-Node/wiki/Documentation
 */
var wsServer = new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: false
});



/**
 * Always check and explicitly allow the origin
 *
 */
function originIsAllowed(origin) {
    'use strict';
    if (origin === 'http://CHANGEMETOYOURALLOWEDHOST' || origin === 'http://CHANGEMETOYOURALLOWEDHOST') {
        return true;
    }
    return false;
}


/**
 * Avoid injections
 * @param string str String message
 *
 */
function htmlEntities(str) {
    'use strict';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Send message to all connections
 * @param string object Json formated message
 *
 */
var sendToAll = function (message) {
    'use strict';
    var i;
    for (i = 0; i < broadcastTo.length; i += 1) {
        if (broadcastTo[i]) {
            broadcastTo[i].sendUTF(JSON.stringify(message));
        }
    }
};

// Object with enemies that are stored for new connecting users so they are updated directly.
var storedCreatures = {
    creatures: []
};

// Votes done by connections
var votingList = {
    votes: []
};

var id = 0, votingStarted = false, allowedVotes = ['walker', 'shooter'], timeoutId;

/**
 * Randomize between two ints
 * @param int min Min value
 * @param int max Max value
 *
 * @return int Random
 */
function randomInt(min, max) {
    'use strict';
    return Math.floor(Math.random() * ((max - min) + 1) + min);
}

/**
 * Initiates voting check to tally all votes made by users during the timeout
 *
 */
var checkVotes = function () {
    'use strict';
    // Reset voting list
    votingList.votes = [];
    var i, highest = 0, temp, winner, vote, locationSpawnRandom, positionLeft, positionTop;
    votingStarted = true;
    var tally = {
        walker: 0,
        shooter: 0
    };
    timeoutId = setTimeout(function () {
        if (votingList.votes.length > 0) {
            for (i = 0; i < votingList.votes.length; i += 1) {
                vote = votingList.votes[i].vote;
                tally[vote] += 1;
            }
            for (i = 0; i < allowedVotes.length; i += 1) {
                temp = tally[allowedVotes[i]];
                if (temp > highest) {
                    highest = temp;
                    winner = allowedVotes[i];
                }
            }
            locationSpawnRandom = randomInt(1, 2);
            if (locationSpawnRandom === 1) {
                positionLeft = 0;
                positionTop = 6;
            } else {
                positionLeft = 0;
                positionTop = 14;
            }
            var jsonMessage = {
                type: 'setCreateCreature',
                creatureType: winner,
                creatureId: id,
                topPos: positionTop,
                leftPos: positionLeft
            };
            sendToAll(jsonMessage);

            // Push all creatures that are made to the server to sync between client and server
            storedCreatures.creatures.push({
                type: winner,
                enemyId: id,
                topPos: positionTop,
                leftPos: positionLeft
            });
            id += 1;

            // Create another enemy if the type is walker
            if (winner === 'walker') {
                locationSpawnRandom = randomInt(1, 2);
                if (locationSpawnRandom === 1) {
                    positionLeft = 0;
                    positionTop = 6;
                } else {
                    positionLeft = 0;
                    positionTop = 14;
                }
                storedCreatures.creatures.push({
                    type: winner,
                    enemyId: id,
                    topPos: positionTop,
                    leftPos: positionLeft
                });
                jsonMessage.creatureId = id;
                jsonMessage.topPos = positionTop;
                jsonMessage.leftPos = positionLeft;
                sendToAll(jsonMessage);
                id += 1;
            }
        }

        votingStarted = false;
    }, 12000);
};

var minimumReached = false, intervalId, decidePlayerVotes = [], playerVotingStarted = false, decidePlayerTimeout, deathCount = 10, ongoingEvent = false;

/**
 * Check votes to see who is the upcoming player
 *
 */
var decidePlayer = function () {
    'use strict';
    var i, playerPos;
    ongoingEvent = false;
    playerVotingStarted = true;
    decidePlayerTimeout = setTimeout(function () {
        if (decidePlayerVotes.length !== 0) {
            playerPos = randomInt(0, (decidePlayerVotes.length - 1));
            while (decidePlayerVotes[playerPos] === undefined) {
                playerPos = randomInt(0, (decidePlayerVotes.length - 1));
            }
            var jsonMessage = {
                type: 'message',
                userName: 'SERVER',
                text: decidePlayerVotes[playerPos].userName + ' has been chosen'
            };
            for (i = 0; i < broadcastTo.length; i += 1) {
                if (broadcastTo[i]) {
                    if (broadcastTo[i].playerAction === 'playing') {
                        ongoingEvent = true;
                    }
                    if (broadcastTo[i].playerTurn === 'upcoming') {
                        broadcastTo[i].playerTurn = 'observer';
                    }
                    broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
                }
            }
            if (broadcastTo[decidePlayerVotes[playerPos].broadcastId] !== undefined) {
                // Winner has been selected and their turn is adjusted to 'upcoming'
                broadcastTo[decidePlayerVotes[playerPos].broadcastId].playerTurn = 'upcoming';
                decidePlayerVotes = [];
            }
            playerVotingStarted = false;
            if (!ongoingEvent) {
                // If no game is going on go on to select the player
                playerStarting();
            }
        } else {
            // Loop check again if noone has voted
            decidePlayer();
        }
    }, 12000);
};

var avatars = ['hatman', 'oldman', 'paladin'], currentAvatar = 'human', currentPlayer = "...";

/**
 * Initiate player swap between nonplaying user and playing user
 *
 */
var playerStarting = function () {
    'use strict';
    storedCreatures.creatures = [];
    id = 0;
    var jsonMessage = {}, i, msg;

    // Reset all timeouts and intervals
    if (intervalId !== undefined) {
        clearInterval(intervalId);
    }
    if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
    }
    if (decidePlayerTimeout !== undefined) {
        clearTimeout(decidePlayerTimeout);
    }

    // Change action of currently playing person to observer
    for (i = 0; i < broadcastTo.length; i += 1) {
        if (broadcastTo[i] && broadcastTo[i].playerAction === 'playing') {
            broadcastTo[i].playerAction = 'observer';
            jsonMessage.type = 'changePlayer';
            jsonMessage.playerStatus = 'observer';
            broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
        }
        // Reset enemies
        if (broadcastTo[i]) {
            msg = {
                type: 'enemyCreationCorrect',
                creatures: storedCreatures.creatures,
                restart: 'true'
            };
            broadcastTo[i].sendUTF(JSON.stringify(msg));
        }
    }
    var playerLeft = true, avatar = 'human';

    // Change user with 'upcoming' turn to be the one in control of the character
    for (i = 0; i < broadcastTo.length; i += 1) {
        if (broadcastTo[i] && broadcastTo[i].playerTurn === 'upcoming') {
            playerLeft = false;
            broadcastTo[i].playerAction = 'playing';
            jsonMessage.type = 'changePlayer';
            jsonMessage.playerStatus = 'playing';
            avatar = broadcastTo[i].avatar;
            currentPlayer = broadcastTo[i].userName;
            broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
            msg = {
                type: 'message',
                text: "Voting has started. Type !walker or !shooter to vote.",
                class: 'server',
                userName: 'SERVER'
            };
            sendToAll(msg);
            intervalId = setInterval(function () {
                checkVotes();
            }, 12100);
            deathCount = 10;
        }
    }
    currentAvatar = avatar;

    // If the person who was 'upcoming' left the game a new user will be voted for
    if (playerLeft) {
        jsonMessage.type = 'message';
        jsonMessage.text = "Winning player left the game. Type !me to nominate yourself for the upcoming round.";
        jsonMessage.class = 'server';
        jsonMessage.userName = 'SERVER';
        decidePlayer();
    }
    msg = {
        type: 'setAvatar',
        avatar: avatar,
        currentPlayer: currentPlayer
    };
    sendToAll(msg);
};

/**
 * Accept connection under the broadcast-protocol
 *
 */
function acceptConnectionAsBroadcast(request) {
    'use strict';
    var connection = request.accept('broadcast-protocol', request.origin);
    connection.broadcastId = broadcastTo.push(connection) - 1;
    connection.playerTurn = 'observer';
    connection.playerAction = 'observer';
    connection.avatar = 'human';
    broadcastTo[connection.broadcastId].avatar = 'human';
    connection.actionReady = true;
    if (storedCreatures !== undefined) {
        storedCreatures.type = 'enemyCreationCorrect';
        storedCreatures.restart = "false";
        connection.sendUTF(JSON.stringify(storedCreatures));
        connection.updatedCreatures = true;
    }
    if (!minimumReached && broadcastTo.length > 1 && decidePlayerVotes.length === 0) {
        minimumReached = true;
        var jsonMessage = {};
        jsonMessage.type = 'message';
        jsonMessage.text = "Voting has started. Type !me to nominate yourself.";
        jsonMessage.class = 'server';
        jsonMessage.userName = 'SERVER';
        decidePlayer();
        sendToAll(jsonMessage);
    }

    // Message to adjust new user to others status
    var introMessage = {
        type: 'introMessage',
        currentAvatar: currentAvatar,
        deathCount: deathCount,
        currentPlayer: currentPlayer
    }
    connection.sendUTF(JSON.stringify(introMessage));
    console.log((new Date()) + ' Broadcast connection accepted from ' + request.origin + ' id = ' + connection.broadcastId);
    // Callback to handle each message from the client
    connection.on('message', function (message) {
        var jsonMessage = JSON.parse(message.utf8Data);
        var clients = 0, i;
        switch (jsonMessage.type) {
        case 'message':
            if (jsonMessage.text === '!') {
                jsonMessage.text = 'Type !me to nominate yourself as an upcoming player. Type !avatar to see avatar options. Type !walker or !shooter to vote for an enemy. Press the gamefield to throw potions at the player. The game will not start until two or more users are online. You can not vote for enemies or change avatar while playing.';
                jsonMessage.class = 'personal';
                jsonMessage.userName = connection.userName;
                connection.sendUTF(JSON.stringify(jsonMessage));
                break;
            }
            if (votingStarted && jsonMessage.text.indexOf('!') === 0 && allowedVotes.indexOf(jsonMessage.text.substring(1)) > -1 && broadcastTo[connection.broadcastId].playerAction !== 'playing') {
                var voted = false;
                for (i = 0; i < votingList.votes.length; i += 1) {
                    if (votingList.votes[i].user === connection.userName) {
                        votingList.votes[i].vote = jsonMessage.text.substring(1);
                        voted = true;
                    }
                }
                if (!voted) {
                    votingList.votes.push({
                        user: connection.userName,
                        vote: jsonMessage.text.substring(1)
                    });
                }
                jsonMessage.class = 'vote';
            } else if (playerVotingStarted && jsonMessage.text === '!me') {
                var voted = false;
                for (i = 0; i < decidePlayerVotes.length; i += 1) {
                    if (decidePlayerVotes[i].broadcastId === connection.broadcastId) {
                        voted = true;
                    }
                }
                if (!voted) {
                    decidePlayerVotes.push({
                        broadcastId: connection.broadcastId,
                        userName: connection.userName
                    });
                }
                jsonMessage.class = 'vote';
            } else if (jsonMessage.text.indexOf('!avatar') === 0) {
                if (avatars.indexOf(jsonMessage.text.substring(8)) > -1 && broadcastTo[connection.broadcastId].playerAction !== 'playing') {
                    connection.avatar = jsonMessage.text.substring(8);
                    broadcastTo[connection.broadcastId].avatar = connection.avatar;
                    var i;
                    jsonMessage.text = 'Avatar ' + connection.avatar + ' set as your fighter.';
                    jsonMessage.class = 'personal';
                    jsonMessage.userName = connection.userName;
                    connection.sendUTF(JSON.stringify(jsonMessage));
                    var usernames = [];
                    for (i = 0; i < broadcastTo.length; i += 1) {
                        if (broadcastTo[i]) {
                            usernames.push({
                                userName: broadcastTo[i].userName,
                                avatar: broadcastTo[i].avatar
                            });
                        }
                    }
                    jsonMessage.type = 'updateUsers';
                    jsonMessage.users = usernames;
                    sendToAll(jsonMessage);
                    break;
                } else {
                    var i;
                    jsonMessage.text = 'Avatar options: ';
                    for (i = 0; i < avatars.length; i += 1) {
                        jsonMessage.text += avatars[i] + " ";
                    }
                    jsonMessage.class = 'personal';
                    jsonMessage.userName = connection.userName;
                    connection.sendUTF(JSON.stringify(jsonMessage));
                    break;
                }
            }
            for (i = 0; i < broadcastTo.length; i += 1) {
                if (broadcastTo[i]) {
                    clients += 1;
                    jsonMessage.userName = connection.userName;
                    broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
                }
            }
            break;
        case 'startPlayerVoting':
            jsonMessage.type = 'message';
            jsonMessage.text = "Voting has started for the next round. Type !me to nominate yourself.";
            jsonMessage.class = 'server';
            jsonMessage.userName = 'SERVER';
            decidePlayer();
            sendToAll(jsonMessage);
            break;
        case 'playerDeath':
            deathCount -= 1;
            jsonMessage.deathCount = deathCount;

            if (jsonMessage.enemyId) {
                for (i = 0; i < storedCreatures.creatures.length; i += 1) {
                    if (storedCreatures.creatures[i].enemyId == jsonMessage.enemyId) {
                        storedCreatures.creatures.splice(i, 1);
                    }
                }
            }
            sendToAll(jsonMessage);
            if (deathCount === 0) {
                playerStarting();
            }
            break;
        case 'setUser':
            if (connection.userName !== jsonMessage.userName) {
                connection.userName = jsonMessage.userName;
                jsonMessage.text = jsonMessage.userName + " has joined the party.";
                sendToAll(jsonMessage);
            }
            break;
        case 'updateUsers':
            var usernames = [];
            for (i = 0; i < broadcastTo.length; i += 1) {
                if (broadcastTo[i]) {
                    usernames.push({
                        userName: broadcastTo[i].userName,
                        avatar: broadcastTo[i].avatar
                    });
                }
            }
            jsonMessage.users = usernames;
            sendToAll(jsonMessage);
            break;
        case 'movement':
            sendToAll(jsonMessage);
            break;
        case 'enemyMovement':
            sendToAll(jsonMessage);
            break;
        case 'creatureAction':
            for (i = 0; i < broadcastTo.length; i += 1) {
                if (broadcastTo[i] && broadcastTo[i].playerStatus !== 'playing') {
                    broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
                }
            }
            break;
        case 'playerAction':
            if (broadcastTo[connection.broadcastId] !== undefined && broadcastTo[connection.broadcastId].actionReady) {
                sendToAll(jsonMessage);
                broadcastTo[connection.broadcastId].actionReady = false;
                setTimeout(function () {
                    if (broadcastTo[connection.broadcastId] != undefined) {
                        broadcastTo[connection.broadcastId].actionReady = true;
                    }
                }, 9000);
            }
            break;
        }
    });

    // Callback when client closes the connection
    connection.on('close', function () {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected broadcastid = ' + connection.broadcastId + '.');
        broadcastTo[connection.broadcastId] = null;
        var i, usernames = [], upcoming = 'none', newMsg;
        for (i = 0; i < broadcastTo.length; i += 1) {
            if (broadcastTo[i]) {
                usernames.push({
                    userName: broadcastTo[i].userName,
                    avatar: broadcastTo[i].avatar
                });
            }
        }
        for (i = 0; i < decidePlayerVotes.length; i += 1) {
            if (decidePlayerVotes[i].broadcastId === connection.broadcastId) {
                decidePlayerVotes.splice(i, 1);
            }
        }
        var jsonMessage = {
            type: "updateUsers",
            users: usernames
        };
        for (i = 0; i < broadcastTo.length; i += 1) {
            if (broadcastTo[i]) {
                broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
            }
            if (broadcastTo[i] && broadcastTo[i].playerTurn === 'upcoming') {
                upcoming = broadcastTo[i];
            }
        }
        if (broadcastTo.length === 1) {
            minimumReached = false;
        } else if (broadcastTo.length === 0) {
            if (intervalId != undefined) {
                clearInterval(intervalId);
            }
            if (timeoutId != undefined) {
                clearTimeout(timeoutId);
            }
            if (decidePlayerTimeout != undefined) {
                clearTimeout(decidePlayerTimeout);
            }
            storedCreatures.creatures = [];
            id = 0;
        }
        if (connection.playerAction === 'playing') {
            if (intervalId != undefined) {
                clearInterval(intervalId);
            }
            if (timeoutId != undefined) {
                clearTimeout(timeoutId);
            }
            if (decidePlayerTimeout != undefined) {
                clearTimeout(decidePlayerTimeout);
            }
            var msg = {
                type: 'message',
                text: 'Player has left the game.'
            };
            if (upcoming !== 'none') {
                msg.text += ' ' + upcoming.userName + ' is coming up.';
            } else {
                msg.text += ' Type !me to nominate yourself to play.';
                decidePlayer();
            }
            msg.userName = 'SERVER';
            for (i = 0; i < broadcastTo.length; i += 1) {
                if (broadcastTo[i]) {
                    broadcastTo[i].sendUTF(JSON.stringify(msg));
                }
                if (upcoming !== 'none' && broadcastTo[i] && broadcastTo[i].playerTurn === 'upcoming') {
                    playerStarting();
                }
            }
        }
    });

    return true;
}



/**
 * Create a callback to handle each connection request
 *
 */
wsServer.on('request', function (request) {
    'use strict';
    var status = null, i;

    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    // Loop through protocols. Accept by highest order first.
    for (i = 0; i < request.requestedProtocols.length; i += 1) {
        if (request.requestedProtocols[i] === 'broadcast-protocol') {
            status = acceptConnectionAsBroadcast(request);
        }
    }

    // Unsupported protocol.
    if (!status) {
        //acceptConnectionAsEcho(request, null);
        console.log('Subprotocol not supported');
        request.reject(403, 'Subprotocol not supported, only supporting "echo-protocol" or "broadcast-protocol".');
    }

});
