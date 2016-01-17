/**
* Shim layer, polyfill, for requestAnimationFrame with setTimeout fallback.
* http://paulirish.com/2011/requestanimationframe-for-smart-animating/
*/
window.requestAnimFrame = (function () {
    'use strict';
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();


var activeplayer = false;
var websocket, username = document.getElementById('username'), lives = document.getElementById('lives'), playingPlayer = document.getElementById('playingPlayer'), createuser = document.getElementById('createuser'), connect = document.getElementById('connect');

// Hide game before player connects to server.
$('#gameContain').hide();
$('#displayInfo').hide();
// Send text to all users through the server
function sendText() {
    'use strict';
    var dt = new Date();
    // Construct a msg object containing the data the server needs to process the message from the chat client.
    var msg = {
        type: "message",
        text: document.getElementById('message').value,
        date: dt.toLocaleTimeString()
    };

    // Send the msg object as a JSON-formatted string.
    websocket.send(JSON.stringify(msg));
}

$(document).ready(function () {
    'use strict';
    // Global variables
    var player, content, avatar, tileSize, gridSize, left, top, posLeft, posTop, gamefield, td = 1, enemyMoved = false, firedLazor = false;
    // Arrays
    var gameArea, creaturesCreated = [];

    // Get HTML elements that are to be used
    player = document.getElementById("player");
    content = document.getElementById("gameContain");
    gamefield = document.getElementById("content");

    // Size of each tile
    tileSize = 32;
    // Number of tiles per row
    gridSize = 25;

    // Starting avatar of player if nothing else is set
    avatar = 'human';

    // Sets content size to match tilesize and gridsize
    content.style.width = gridSize * tileSize + "px";
    content.style.height = 19 * tileSize + "px";

    // Gets starting position of player
    left = player.offsetLeft;
    top = player.offsetTop;

    // Starting position of player in the grid
    posLeft = 10;
    posTop = 0;

    /**
     * This is the game area with a 10x10 grid
     * 10 - nothing (grass)
     * 11 - wall (impassible)
     * 12 - box (movable)
     * 13, 15, 16 - door (passible)
     */
    gameArea = [
        11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 15, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 14, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10, 14, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 16,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 10, 10, 14, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
        11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11
    ];

    /**
     * Initiates the game area by adding each tile as a div with class and id to content area
     * @param array gameArea Contains array with int numbers that represent tiles
     */
    var drawGamePlan = function (gameArea) {
        var i, tile, tileFromArray;

        for (i = 0; i < gameArea.length; i += 1) {
            // Create the tile
            tile = document.createElement("div");

            tileFromArray = gameArea[i];

            // Add class name to tile
            tile.className = "tile t" + tileFromArray;
            // Add ID to tile
            tile.id = "n" + i;
            // Append tile to the content
            content.appendChild(tile);
        }
    };

    /**
     * Changes position variables for player and style to draw the change out on the screen
     * @param int x - direction to move horizontally
     * @param int y - direction to move vertically
     */
    var movePlayer = function (x, y, playerMove) {
        if (playerMove === 'undefined') {
            playerMove = 'true';
        }
        // Update player position variables
        posLeft += x;
        posTop += y;

        // Assign left and right to the pixel positions inside the area that the player is moving to
        left = posLeft * tileSize;
        top = posTop * tileSize;

        // To actually visually move player we need to change left and top in style as pixels
        player.style.left = left + "px";
        player.style.top = top + "px";

        // Change visualisation of player by changing class name based on direction of x
        if (x === 1) {
            player.className = 'player ' + avatar + ' right';
        } else if (x === -1) {
            player.className = 'player ' + avatar + ' left';
        }

        // If player is the one playing, send out message to move observers character aswell
        if (websocket !== undefined && activeplayer) {
            var msg = {
                type: "movement",
                moveLeft: x,
                moveTop: y,
                leftCor: posLeft,
                topCor: posTop
            };
            websocket.send(JSON.stringify(msg));
        }
    };

    /**
    * Switches two tiles and updates their classes to redraw them
    * @param int current - array position of the tile to move
    * @param int next - array position to move tile to
    */
    var moveTile = function (current, next) {
        var tile = gameArea[current];

        gameArea[next] = tile;
        gameArea[current] = 10;

        // Give the tiles new classnames to redraw them
        document.getElementById("n" + next).className = "tile t" + tile; // box tile here
        document.getElementById("n" + current).className = "tile t" + 10; // current tile will be empty
    };

    /**
     * Creates enemy that attacks the player.
     * @param string creature Creature type (walker/shooter) that determines how the enemy will act
     * @param int varId Id of created creature
     * @param int left Left position that creature will start at
     * @param int top Top position that creature will start at
     */
    var EnemyCreature = function (creature, varId, leftPos, topPos) {
        this.enemyId = varId;
        var div = document.createElement('div');
        this.creatureType = creature;

        // Add danger to class to check for hit detection and type
        div.className = 'enemy danger ' + this.creatureType;
        div.id = this.enemyId;
        gamefield.appendChild(div);
        this.corrected = false;
        this.enemy = div;
        this.enemyleft = this.enemy.offsetLeft;
        this.enemytop = this.enemy.offsetTop;
        this.enemyposLeft = leftPos;
        this.enemyposTop = topPos;
    };

    /**
     * This function checks that the move was possible and returns either the new position or false
     * @param int moveLeft - direction to move horizontally, range: -1 -> 1
     * @param int moveTop - direction to move vertically, range: -1 -> 1
     * @return {bool} - if player was movable true is returned, otherwise false is returned
     */
    var isPlayerMovable = function (moveLeft, moveTop) {
        var tile, tilePos, newLeft, newTop, movable, nextPos, nextTile;
        // This time we want the grid position values, not the pixel position values
        newLeft = posLeft + moveLeft;
        newTop = posTop + moveTop;

        movable = false;
        // Get the tile player wants to move to
        // left is the row number and top is the column number
        tilePos = newLeft + newTop * gridSize;
        tile = gameArea[tilePos];

        // Switch case on the tile value - do different things depending on what tile player is moving to
        switch (tile) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:  // empty
        case 13: // door
            // Move player to tile
            movable = true;
            break;
        case 11:
            // Wall, don't move player
            break;
        case 12:
            // Calculate where the sibling tile to be checked is in the array
            nextPos = tilePos + moveLeft + (gridSize * moveTop);
            nextTile = gameArea[nextPos];

            // Only move if the sibling tile to be moved to is empty
            if (nextTile === 10) {
                moveTile(tilePos, nextPos);
                // Allow  player to move to the current tile
                movable = true;
            }
            break;
        default:
            movable = false;
        }
        return movable;
    };

    /**
     * Changes position variables for enemy and style to draw the change out on the screen
     * @param int x - direction to move horizontally
     * @param int y - direction to move vertically
     */
    EnemyCreature.prototype.moveEnemy = function (x, y) {
        // Update enemies position variables
        this.enemyposLeft += x;
        this.enemyposTop += y;

        // Assign left and right to the pixel positions inside the area that the enemy is moving to
        this.enemyleft = this.enemyposLeft * tileSize;
        this.enemytop = this.enemyposTop * tileSize;

        // To actually visually move enemy we need to change left and top in style as pixels
        this.enemy.style.left = this.enemyleft + "px";
        this.enemy.style.top = this.enemytop + "px";

        // Change visualisation of enemy by changing class name based on direction of x
        if (x === 1) {
            this.enemy.className = 'enemy danger right ' + this.creatureType;
        } else if (x === -1) {
            this.enemy.className = 'enemy danger ' + this.creatureType;
        }

        // If player is the one playing, send out message to move observers character aswell
        if (activeplayer) {
            var msg = {
                type: "enemyMovement",
                moveLeft: x,
                moveTop: y,
                leftCor: this.enemyposLeft,
                topCor: this.enemyposTop,
                enemyId: this.enemyId
            };
            websocket.send(JSON.stringify(msg));
        }
    };

    /**
     * Function that fires a missile towards a specific direction and animates it. Uses prototype to connect to specific enemy.
     * @param string direction Direction that the attack will be aimed at (up, left, right, down)
     */
    EnemyCreature.prototype.fireLazor = function (direction) {
        if (direction === 'undefined') {
            direction = 'up';
        }
        // Sets standard distance to be used if nothing else is determined
        var distanceLeft = this.enemy.style.left, distanceTop = this.enemy.style.top;

        // Checks direction parameter and adjusts endposition for projectile
        if (direction === 'left') {
            distanceLeft = '35px';
        } else if (direction === 'right') {
            distanceLeft = gridSize * tileSize - 60 + 'px';
        } else if (direction === 'up') {
            distanceTop = '35px';
        } else if (direction === 'down') {
            distanceTop = 19 * tileSize - 60 + 'px';
        }

        // Create "missile" and remove after reaching the wall
        $('<div class="lazor"></div>').addClass('lazor danger ' + direction).css({
            'left': this.enemy.style.left,
            'top': this.enemy.style.top
        }).appendTo('#content').animate({
            left: distanceLeft,
            top: distanceTop
        }, 1500, function () {
            $(this).remove();
        });

        firedLazor = true;

        // If player is the one playing send out message to observers that will fire their "missiles" to sync
        if (activeplayer) {
            var msg = {
                type: 'creatureAction',
                action: 'fireLazor',
                direction: direction,
                enemyId: this.enemyId
            };
            websocket.send(JSON.stringify(msg));
        }
    };

    /**
     * Function that calculates shooting for enemy character based on position to the player
     */
    EnemyCreature.prototype.calcShooting = function () {
        if (this.creatureType === 'shooter') {
            if (this.enemytop === top && this.enemyleft > left) {
                this.fireLazor('left');
            } else if (this.enemytop === top && this.enemyleft < left) {
                this.fireLazor('right');
            } else if (this.enemyleft === left && this.enemytop < top) {
                this.fireLazor('down');
            } else if (this.enemyleft === left && this.enemytop > top) {
                this.fireLazor('up');
            }
        }
    };

    /**
     * Primitive movement AI for enemy creatures. Will move around simple walls aswell.
     */
    EnemyCreature.prototype.makeMovement = function () {
        if (this.enemyleft > left) {
            if (this.isEnemyMovable(-1, 0)) {
                this.moveEnemy(-1, 0);
            } else if (this.enemytop < top) {
                this.moveEnemy(0, 1);
            } else if (this.enemytop > top && this.isEnemyMovable(0, -1)) {
                this.moveEnemy(0, -1);
            }
        } else if (this.enemyleft < left) {
            if (this.isEnemyMovable(1, 0)) {
                this.moveEnemy(1, 0);
            } else if (this.enemytop < top && this.isEnemyMovable(0, 1)) {
                this.moveEnemy(0, 1);
            } else if (this.enemytop > top && this.isEnemyMovable(0, -1)) {
                this.moveEnemy(0, -1);
            }
        } else if (this.enemytop > top) {
            if (this.isEnemyMovable(0, -1)) {
                this.moveEnemy(0, -1);
            } else if (this.enemyleft < left && this.isEnemyMovable(1, 0)) {
                this.moveEnemy(1, 0);
            } else if (this.enemyleft > left && this.isEnemyMovable(-1, 0)) {
                this.moveEnemy(-1, 0);
            }
        } else if (this.enemytop < top) {
            if (this.isEnemyMovable(0, 1)) {
                this.moveEnemy(0, 1);
            } else if (this.enemyleft < left && this.isEnemyMovable(1, 0)) {
                this.moveEnemy(1, 0);
            } else if (this.enemyleft > left && this.isEnemyMovable(-1, 0)) {
                this.moveEnemy(-1, 0);
            }
        }
    };

    /**
     * This function checks that the move was possible and returns either the new position or false
     * @param int moveLeft - direction to move horizontally, range: -1 -> 1
     * @param int moveTop - direction to move vertically, range: -1 -> 1
     * @return boolean - if enemy was movable true is returned, otherwise false is returned
     */
    EnemyCreature.prototype.isEnemyMovable = function (moveLeft, moveTop) {
        var tile, tilePos, newLeft, newTop, movable, nextPos, nextTile;
        // This time we want the grid position values, not the pixel position values
        newLeft = this.enemyposLeft + moveLeft;
        newTop = this.enemyposTop + moveTop;

        movable = false;
        enemyMoved = true;
        // Get the tile enemy wants to move to
        // left is the row number and top is the column number
        tilePos = newLeft + newTop * gridSize;
        tile = gameArea[tilePos];

        // Switch case on the tile value - do different things depending on what tile enemy is moving to
        switch (tile) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:  // empty
        case 13: // door
            // Move enemy to tile
            movable = true;
            break;
        case 11:
            // Wall, don't move enemy
            break;
        case 12:
            // Calculate where the sibling tile to be checked is in the array
            nextPos = tilePos + moveLeft + (gridSize * moveTop);
            nextTile = gameArea[nextPos];

            // Only move if the sibling tile to be moved to is empty
            if (nextTile === 10) {
                moveTile(tilePos, nextPos);
                // Allow  enemy to move to the current tile
                movable = true;
            }
            break;
        default:
            // Tile was impassible - collided, do not move enemy
            movable = false;
        }
        var i;

        // Simple check to prevent all enemy creatures from stacking ontop of eachother
        for (i = 0; i < creaturesCreated.length; i += 1) {
            if (newLeft === creaturesCreated[i].creature.enemyposLeft && newTop === creaturesCreated[i].creature.enemyposTop) {
                movable = false;
            }
        }

        return movable;
    };

    window.addEventListener('keydown', function (event) {
        // Only check movement is player is the active player
        if (activeplayer) {
            var key;
            // Gets what key was pressed as number
            key = event.keyCode || event.which;

            if (key === 37 && isPlayerMovable(-1, 0)) {
                // Go left - Use movePlayer-function
                movePlayer(-1, 0);
            }

            if (key === 38 && isPlayerMovable(0, -1)) {
                // Go up - Use movePlayer-function
                movePlayer(0, -1);
            }
            if (key === 39 && isPlayerMovable(1, 0)) {
                // Go right - Use movePlayer-function
                movePlayer(1, 0);
            }
            if (key === 40 && isPlayerMovable(0, 1)) {
                // Go down - Use movePlayer-function
                movePlayer(0, 1);
            }

            if (key !== 37 && key !== 38 && key !== 39 && key !== 40) {
                // return this function so that the default button action is performed instead
                return true;
            }
            // Player action was performed - prevent button default
            event.preventDefault();
        }

    });

    /**
     * Corrects player position for server sync
     * @param int leftCor Left position to correct to
     * @param int topCor Top position to correct to
     */
    var correctPosition = function (leftCor, topCor) {
        player.style.left = leftCor;
        player.style.top = topCor;
        posLeft = leftCor;
        posTop = topCor;
    };

    /**
     * Corrects enemy position for server sync
     * @param object enemyTarget Specific enemy to correct
     * @param int leftCor Left position to correct to
     * @param int topCor Top position to correct to
     */
    var correctEnemyPosition = function (enemyTarget, leftCor, topCor) {
        enemyTarget.enemy.style.left = leftCor;
        enemyTarget.enemy.style.top = topCor;
        enemyTarget.enemyposLeft = leftCor;
        enemyTarget.enemyposTop = topCor;
    };

    // Enables send message with enter key
    $('#message').keydown(function (event) {
        if (event.keyCode === 13) {
            sendText();
        }
    });

    /**
     * Sends clicked information to server and other players to perform a bomb on the gamefield
     * @param int x Left position
     * @param int y Top position
     */
    var checkClickedPosition = function (x, y) {
        if (!activeplayer) {
            var msg = {
                type: "playerAction",
                action: "bomb",
                posLeft: x,
                posTop: y
            };
            websocket.send(JSON.stringify(msg));
        }
    };

    /**
     * Gets actual position that was clicked on the gamefield and sends information to server handler
     * @param object e Event from clicking
     */
    function getClickPosition(e) {
        var divOffset = $(this).offset();
        var relX = e.pageX - divOffset.left;
        var relY = e.pageY - divOffset.top;

        // Use Math.round divided by tilesize to adjust to player and enemy position
        var mouseClickX = Math.round(relX / tileSize);
        var mouseClickY = Math.round(relY / tileSize);
        checkClickedPosition(mouseClickX, mouseClickY);
    }

    /**
     * Creates an enemy creature
     * @param string creatureType Type of creature to be created (walker, shooter)
     * @param int creatureId Id of creature created
     */
    var createCreature = function (creatureType, creatureId, leftPos, topPos) {
        var newFigure;

        newFigure = new EnemyCreature(creatureType, creatureId, leftPos, topPos);

        creaturesCreated.push({
            type: creatureType,
            creature: newFigure
        });
    };

    /**
     * Checks to see if playing character has been hit by anything with the class danger
     */
    var checkHits = function () {
        var i, id, msg, dangers = document.getElementsByClassName("danger");
        for (i = 0; i < dangers.length; i += 1) {
            if (parseInt(dangers[i].style.left) >= (parseInt(player.style.left) - tileSize + 10) &&
                    parseInt(dangers[i].style.left) <= (parseInt(player.style.left) + tileSize - 10) &&
                    parseInt(dangers[i].style.top) >= (parseInt(player.style.top) - tileSize + 10) &&
                    parseInt(dangers[i].style.top) <= (parseInt(player.style.top) + tileSize - 10)) {
                id = $(dangers[i]).prop('id');
                $(dangers[i]).remove();
                msg = {
                    type: "playerDeath",
                    enemyId: id
                };
                websocket.send(JSON.stringify(msg));
            }
        }
    };

    /**
     * Gameloop used to keep enemies moving and to check hits from enemies on a steady flow
     */
    var gameLoop = function () {
        var i;
        if (activeplayer) {
            checkHits();
        }
        if (!enemyMoved && activeplayer && creaturesCreated.length > 0) {
            for (i = 0; i < creaturesCreated.length; i += 1) {
                creaturesCreated[i].creature.makeMovement();
            }
        }
        if (!firedLazor && creaturesCreated.length > 0 && activeplayer) {
            for (i = 0; i < creaturesCreated.length; i += 1) {
                if (creaturesCreated[i].type === 'shooter') {
                    creaturesCreated[i].creature.calcShooting();
                }
            }
        }

        // Td % xx enables adjustable firing of "missiles" frequency and enemy movement speed
        if (td % 90 === 0) {
            firedLazor = false;
            td = 0;
        }
        if (td % 30 === 0) {
            enemyMoved = false;
        }
        td += 1;
        if (activeplayer) {
            window.requestAnimFrame(gameLoop);
        }
    };

    // Add event listener to mouse click on gamefield
    gamefield.addEventListener("click", getClickPosition, false);

    // Connect to server by clicking connect button
    connect.addEventListener('click', function () {
        var corrected = false;

        if (username.value) {
            websocket = new WebSocket('ws://CHANGEMETOYOURSERVER:ANDPORT', 'broadcast-protocol');
        }
        if (websocket && username.value) {
            websocket.onopen = function () {
                if (username.value) {
                    // Hide login info and show the gamefield
                    $('.loginInfo').hide();
                    $('#gameContain').fadeIn();
                    $('#displayInfo').fadeIn();
                    // Set user on server to be the provided username value
                    var msg = {
                        type: "setUser",
                        userName: username.value
                    };
                    websocket.send(JSON.stringify(msg));

                    // Enable messages to be sent
                    $('#message').prop('disabled', false);
                    $('#send_message').prop('disabled', false);

                    // Update users online
                    msg = {
                        type: "updateUsers"
                    };
                    websocket.send(JSON.stringify(msg));
                }
            };

            /**
             * Master function for handling all communication between server and player
             * @param object event Message sent from server
             */
            websocket.onmessage = function (event) {
                // Convert string message to json message
                var jsonMessage = JSON.parse(event.data), addedClass;
                var i, jsonCreaturesLength, creaturesCreatedLength, leftDirection, topDirection, msg;
                // Switch for different types of message
                switch (jsonMessage.type) {
                case 'introMessage': // Basic message to be seen by all in chat
                    $(lives).text(jsonMessage.deathCount);
                    $(playingPlayer).text(jsonMessage.currentPlayer);
                    $('#playingPlayerAvatar').addClass('usersprite ' + jsonMessage.currentAvatar);
                    avatar = jsonMessage.currentAvatar;
                    player.className = 'player ' + avatar;
                    $('#output').prepend('<p><span class="message">Type ! to see options.</span></p>');
                    break;
                case 'message': // Basic message to be seen by all in chat
                    addedClass = '';
                    if (jsonMessage.class !== undefined) {
                        addedClass = jsonMessage.class;
                    }
                    $('#output').prepend('<p><span class="username">' + jsonMessage.userName + ':</span> <span class="message ' + addedClass + '">' + jsonMessage.text + '</span></p>');
                    $('#message').val('');
                    break;
                case 'movement': // Moves player character if observering
                    if (!activeplayer) {
                        movePlayer(jsonMessage.moveLeft, jsonMessage.moveTop, 'false');
                        if (player.style.left !== jsonMessage.leftCor && !corrected) {
                            correctPosition(jsonMessage.leftCor, jsonMessage.topCor);
                            corrected = true;
                        }
                    }
                    break;
                case 'enemyCreationCorrect': // Corrects creature creation and adjusts player position
                    jsonCreaturesLength = jsonMessage.creatures.length;
                    creaturesCreatedLength = creaturesCreated.length;
                    if (jsonCreaturesLength === 0 && jsonMessage.restart === "true") {
                        $('.danger').remove();
                        $('.bloodsplat').remove();
                        $(lives).text('10');
                        creaturesCreated = [];
                        posLeft = 10;
                        posTop = 0;
                        movePlayer(0, 0);
                    }
                    if (jsonCreaturesLength > creaturesCreatedLength) {
                        for (i = 0; i < jsonCreaturesLength; i += 1) {
                            createCreature(jsonMessage.creatures[i].type, jsonMessage.creatures[i].enemyId, jsonMessage.creatures[i].leftPos, jsonMessage.creatures[i].topPos);
                        }
                    }
                    break;
                case 'setCreateCreature': // Creates an enemy creature
                    createCreature(jsonMessage.creatureType, jsonMessage.creatureId, jsonMessage.leftPos, jsonMessage.topPos);
                    break;
                case 'enemyMovement': // Moves enemies on the gamefield if player is not playing
                    if (!activeplayer) {
                        for (i = 0; i < creaturesCreated.length; i += 1) {
                            if (creaturesCreated[i].creature.enemyId === jsonMessage.enemyId) {
                                creaturesCreated[i].creature.moveEnemy(jsonMessage.moveLeft, jsonMessage.moveTop);
                                if (creaturesCreated[i].creature.enemy.style.left !== jsonMessage.leftCor && !creaturesCreated[i].creature.corrected) {
                                    correctEnemyPosition(creaturesCreated[i].creature, jsonMessage.leftCor, jsonMessage.topCor);
                                    creaturesCreated[i].creature.corrected = true;
                                }
                            }
                        }
                    }
                    break;
                case 'creatureAction': // Fires "missile" for enemies Id sent from server
                    if (!activeplayer) {
                        for (i = 0; i < creaturesCreated.length; i += 1) {
                            if (creaturesCreated[i].creature.enemyId === jsonMessage.enemyId && creaturesCreated[i].type === 'shooter') {
                                creaturesCreated[i].creature.fireLazor(jsonMessage.direction);
                            }
                        }
                    }
                    break;
                case 'playerDeath': // Sets what happens when a player is hit and creates blood splat based on object hit
                    $(lives).text(jsonMessage.deathCount);
                    if (jsonMessage.enemyId) {
                        $('#' + jsonMessage.enemyId).remove();
                        for (i = 0; i < creaturesCreated.length; i += 1) {
                            if (creaturesCreated[i].creature.enemyId == jsonMessage.enemyId) {
                                creaturesCreated.splice(i, 1);
                            }
                        }
                        $('<div class="bloodsplat larger"></div>').css({
                            'left': player.style.left,
                            'top': player.style.top
                        }).appendTo('#content');
                    } else {
                        $('<div class="bloodsplat"></div>').css({
                            'left': player.style.left,
                            'top': player.style.top
                        }).appendTo('#content');
                    }
                    break;
                case 'changePlayer': // Change active player based on servers playerStatus. Starts game from scratch after 1.5 seconds
                    if (jsonMessage.playerStatus === 'observer') {
                        activeplayer = false;
                    } else if (jsonMessage.playerStatus === 'playing') {
                        activeplayer = false;
                        posLeft = 10;
                        posTop = 0;
                        movePlayer(0, 0);
                        window.setTimeout(function () {
                            td = 0;
                            activeplayer = true;
                            gameLoop();
                        }, 1500);
                        msg = {
                            type: "startPlayerVoting"
                        };
                        websocket.send(JSON.stringify(msg));
                    } else if (jsonMessage.playerStatus === 'upcoming') {
                        activeplayer = false;
                        msg = {
                            type: "playerDeath"
                        };
                        websocket.send(JSON.stringify(msg));
                    }
                    break;
                case 'playerAction': // Creates animation of bomb if a player has clicked on the screen
                    $('<div class="bomb"></div>').css({
                        'left': jsonMessage.posLeft * tileSize,
                        'top': jsonMessage.posTop * tileSize
                    }).appendTo('#content').animate({
                        top: "-=8px"
                    }, 1500, function () {
                        // Create 4 particle effects from the bomb for all directions
                        for (i = 0; i < 4; i += 1) {
                            switch (i) {
                            case 0:
                                leftDirection = (jsonMessage.posLeft - 4) * tileSize;
                                topDirection = jsonMessage.posTop * tileSize;
                                break;
                            case 1:
                                leftDirection = (jsonMessage.posLeft + 4) * tileSize;
                                topDirection = jsonMessage.posTop * tileSize;
                                break;
                            case 2:
                                leftDirection = jsonMessage.posLeft * tileSize;
                                topDirection = (jsonMessage.posTop - 4) * tileSize;
                                break;
                            case 3:
                                leftDirection = jsonMessage.posLeft * tileSize;
                                topDirection = (jsonMessage.posTop + 4) * tileSize;
                                break;
                            }
                            $('<div class="bombEffect danger"></div>').css({
                                'left': jsonMessage.posLeft * tileSize,
                                'top': jsonMessage.posTop * tileSize
                            }).appendTo('#content').animate({
                                left: leftDirection + 'px',
                                top: topDirection + 'px'
                            }, 600, function () {
                                $(this).remove();
                            });
                        }
                        $(this).remove();
                    });
                    break;
                case 'setUser': // Shows message when server sends info that a player has joined
                    $('#output').prepend('<p><span class="message">' + jsonMessage.text + '</span></p>');
                    break;
                case 'setAvatar': // Sets player currently playing avatar
                    avatar = jsonMessage.avatar;
                    player.className = 'player ' + avatar;
                    $('#playingPlayerAvatar').addClass('usersprite ' + avatar);
                    $(playingPlayer).text(jsonMessage.currentPlayer);
                    break;
                case 'updateUsers': // Update users that are online
                    $('#userslist').empty();
                    for (i = 0; i < jsonMessage.users.length; i += 1) {
                        if (jsonMessage.users[i].userName !== null) {
                            $('#userslist').append('<p><div class="usersprite ' + jsonMessage.users[i].avatar + '"></div><span class="username"> ' + jsonMessage.users[i].userName + '</span></p>');
                        }
                    }
                    break;
                }
            };
        }

    });

    /**
     * Initiates area and player
     */
    var init = function () {
        drawGamePlan(gameArea);
        movePlayer(0, 0);
    };

    // Calls init function to start the game
    init();

});
