Installation
-----------------
First complete the following downloads or make sure they're already installed:

* Download [Tileiator](https://github.com/calgus/tileiator-fin.git) from Github.
* Download [Node.js](https://nodejs.org/en/).
* Download [WebSocket-Node v.1.0.3](https://github.com/theturtle32/WebSocket-Node/releases/tag/v1.0.3) from Github. Later versions are released but requires more framework.

To start the Tileiator server run Node.js and locate the server folder inside the
Tileiator folder. To start your server while located inside the server folder type
    node tile-server.js
If you encounter any issues with websocket make sure that the node_modules/websocket folder is located outside of the Tileiator folder
or read through the provided README.md file in the websocket folder for further help. Now you can open the index.html file in your browser
and try the game. Remember to change the "var port = XXXX" to the specific port that you're using aswell as the origin in the "originIsAllowed(origin)" function.
Also remember to change the websocket, "websocket = new WebSocket('location of server', 'broadcast-protocol');", in your tileiator.js file.
##Divs, id and classes
In the index.html you will find 3 important divs identified with classes and ids:
## loginInfo
Is shown at first but hidden with jquery when a user presses the connect button.
The textfield contains the users chosen name that is sent to the server by the websocket
while the connect button connects to the actual server.
## gameContain
This contains the div 'content' that is filled with tiles using Javascript and so the height and width
should not be changed unless more rows of tiles are added. The player controls the div named player.
right
This div has all information displayed to the right of the gamescreen including
chat, message textfield, users and current players stats.
Everything except the contents of gameContain is adjustable with CSS without
effecting the actual game.
## Adding to the game and/or changing the game
## Avatar
To add another avatar you need a 32x32 png file with the avatar facing left, or right
if changes to CSS transform for that avatar is made, and put the file in the img/avatars
folder. Next add the CSS in tileiator.less under the #player tag

    &.singleavatarname {
        background-image:url(../img/avatars/avatarname.png);
    }

For the avatar to be added to the server find the array in tile-server.js
named 'avatars' and add your singleavatarname of your choice. You've now added an avatar.
Enemies
Adding a new enemy is also done by getting a 32x32 tile png image, facing left,
and added to the img/enemies folder. Add the following in your tileiator.less under the .enemy tag

    &.singleenemyname {
        background-image:url(../img/enemies/enemyname.png);
    }

Now add your enemy name in the 'allowedVotes' array in tile-server.js to enable the option
to vote for your new enemy. Further down in the 'checkVotes' function you can add specific conditions
to your enemy that are based on adding more of them. Below is an example of the extra condition
that the enemy 'walker' has with the purpose of spawning two of them.

    sendToAll(jsonMessage);
    storedCreatures.creatures.push({
        type: winner,
        enemyId: id
    });
    id += 1;
    if (winner === 'walker') {
        storedCreatures.creatures.push({
            type: winner,
            enemyId: id
        });
        jsonMessage.creatureId = id;
        sendToAll(jsonMessage);
        id += 1;
    }

To enable new abilities for your new enemy you need to add a new function to the EnemyCreature
object. An example of how an added ability works:

    EnemyCreature.prototype.fireLazor = function (direction) {
        $('<div class="lazor"></div>').addClass('lazor danger ' + direction).css({
            'left': this.enemy.style.left,
            'top': this.enemy.style.top
        }).appendTo('#content').animate({
            left: distanceLeft,
            top: distanceTop
        }, 1500, function () {
            $(this).remove();
        });
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

The function above adds the ability fireLazor which will shoot an object a specific distance.
The activeplayer check will send a message to the server where you need another case to the switch to pass the action through to other users.

    case 'creatureAction':
        for (i = 0; i < broadcastTo.length; i += 1) {
            if (broadcastTo[i] && broadcastTo[i].playerStatus !== 'playing') {
                broadcastTo[i].sendUTF(JSON.stringify(jsonMessage));
            }
        }
        break;

Now back to the client again. Everyone else recieving the message wants their enemies to act the same way as the players.

    case 'creatureAction': // Fires "missile" for enemies Id sent from server
        if (!activeplayer) {
            for (i = 0; i < creaturesCreated.length; i += 1) {
                if (creaturesCreated[i].creature.enemyId === jsonMessage.enemyId && creaturesCreated[i].type === 'shooter') {
                    creaturesCreated[i].creature.fireLazor(jsonMessage.direction);
                }
            }
        }
        break;

Now the last piece of the puzzle. Update the gameLoop function so that the creature will fire their own missiles for the player and thereby
starting the chain of events. Remember to create a global variable outside to keep the status of firedLazor so that the enemy won't hammer the player with projectiles.

    if (!firedLazor && creaturesCreated.length > 0 && activeplayer) {
        for (i = 0; i < creaturesCreated.length; i += 1) {
            if (creaturesCreated[i].type === 'shooter') {
                creaturesCreated[i].creature.calcShooting();
            }
        }
    }
    if (td % 90 === 0) {
        firedLazor = false;
    }

Now all that's left is to add some visuals to the missile and you're good to go. This was an example of an established creature action but the same principle
is true for every action you add.
