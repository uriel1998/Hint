/*
Hint
Sends a location ping and hint for Roll20 games

Original script by blawson69 
On Github:	https://github.com/blawson69
Contact me: https://app.roll20.net/users/1781274/ben-l
Patreon: https://www.patreon.com/benscripts

This fork changes the following: 
 - Adds `--player|...` targeting by player display name.
 - Adds `--token|...` targeting by token name, resolving controlling players.
 - Resolves all hint recipients to concrete player IDs before calling `sendPing()`.
 - Sends character-targeted whispers to controlling players instead of character names.
 - Makes Re-Ping self-contained by storing the source token ID and resolved player IDs.
 - Escapes the Re-Ping command payload so quoted hint text does not break the chat button.
 - Updates the help output for the new targeting options.
 - Fixes GM whisper `noarchive` handling.

*/

var Hint = Hint || (function () {
    'use strict';

    //---- INFO ----//

    var version = '0.2',
    debugMode = false,
    styles = {
        box:  'background-color: #fff; border: 1px solid #000; padding: 8px 10px; border-radius: 6px; margin-left: -40px; margin-right: 0px;',
        title: 'padding: 0 0 10px 0; color: #591209; font-size: 1.5em; font-weight: bold; font-variant: small-caps; font-family: "Times New Roman",Times,serif;',
        button: 'background-color: #000; border-width: 0px; border-radius: 5px; padding: 5px 8px; color: #fff; text-align: center;',
        textButton: 'background-color: transparent; border: none; padding: 0; color: #591209; text-decoration: underline;',
        buttonWrapper: 'text-align: center; margin: 10px 0; clear: both;',
        character: 'font-variant: small-caps; color: #591209; font-size: 1.25em;',
        code: 'font-family: "Courier New", Courier, monospace; padding-bottom: 6px;'
    },

    checkInstall = function () {
        log('--> Hint v' + version + ' <-- Initialized');
		if (debugMode) {
			var d = new Date();
			showDialog('Debug Mode', 'Hint v' + version + ' loaded at ' + d.toLocaleTimeString(), 'GM');
		}
    },

    //----- INPUT HANDLER -----//

    handleInput = function (msg) {
        if (msg.type == 'api' && msg.content.startsWith('!hint')) {
			var parms = msg.content.split(/\s+/i);
			if (parms[1]) {
                commandHint(msg);
			} else {
				commandHelp();
			}
		}
    },

    commandHint = function (msg) {
		var args = msg.content.split(/\s*\-\-/i);
        var hint = '', char_ids = [], player_ids = [], token_players = [], visible_to = [], re_ping = false, location_id = '';
        var location_token = null;

        _.each(args, function (arg) {
                if (arg.startsWith('msg|')) {
                    hint = arg.replace('msg|', '');
                }
                if (arg.startsWith('to|')) {
                    var char_list = arg.replace('to|', '').split(/\s*\,\s*/);
                    char_ids = char_ids.concat(getCharacterIDsFromNames(char_list));
                }
                if (arg.startsWith('player|')) {
                    var player_list = arg.replace('player|', '').split(/\s*\,\s*/);
                    player_ids = player_ids.concat(getPlayerIDsFromNames(player_list));
                }
                if (arg.startsWith('token|')) {
                    var token_list = arg.replace('token|', '').split(/\s*\,\s*/);
                    token_players = token_players.concat(token_list);
                }
                if (arg.startsWith('location|')) {
                    location_id = arg.replace('location|', '');
                }
                if (arg.startsWith('visibleto|')) {
                    visible_to = visible_to.concat(arg.replace('visibleto|', '').split(/\s*\,\s*/));
                }
                if (arg.startsWith('re-ping')) {
                    re_ping = true;
                }
            });

		if (location_id) {
            location_token = getObj('graphic', location_id);
        } else if (msg.selected && msg.selected.length === 1) {
            location_token = getObj(msg.selected[0]._type, msg.selected[0]._id);
        } else if (!msg.selected || msg.selected.length > 1) {
			showDialog('Hint Error', 'You must select one token. No more, no less.', 'GM');
			return;
		}

        if (location_token) {
            token_players = getPlayerIDsFromTokens(token_players, location_token.get('pageid'));
            char_ids = _.uniq(char_ids);
            player_ids = _.uniq(player_ids);
            token_players = _.uniq(token_players);

            if (hint != '') {
                var players = _.uniq(_.without(_.flatten(visible_to), 'all', ''));
                if (!players.length) {
                    players = [].concat(player_ids, token_players);
                    _.each(char_ids, function (char_id) {
                        var char = getObj('character', char_id);
                        players = players.concat(getControlledPlayerIDs(char));
                    });
                    players = _.uniq(_.without(_.flatten(players), 'all', ''));
                }

                if (players.length) {
                    var names = [];
                    _.each(char_ids, function (char_id) {
                        var name = getNameFromID(char_id);
                        var subtitle = '<div style=\'' + styles.character + '\'>' + name + '</div>';
                        var char_players = getControlledPlayerIDs(getObj('character', char_id));
                        names.push(name);
                        _.each(char_players, function (player_id) {
                            var player_name = getPlayerNameFromID(player_id);
                            if (player_name) showDialog('', subtitle + hint, player_name);
                        });
                    });
                    _.each(player_ids, function (player_id) {
                        var player_name = getPlayerNameFromID(player_id);
                        if (player_name) {
                            names.push(player_name);
                            showDialog('', hint, player_name);
                        }
                    });
                    _.each(token_players, function (player_id) {
                        var token_player_name = getPlayerNameFromID(player_id);
                        if (token_player_name && !_.contains(player_ids, player_id)) {
                            names.push(token_player_name);
                            showDialog('', hint, token_player_name);
                        }
                    });
                    names = _.uniq(names);
                    if (!re_ping) {
                        var re_ping_command = getRePingCommand(hint, players, location_token.id);
                        var message = '"' + hint + '" was whispered to ' + grammaticallyCorrect(names) + '.<br><a style=\'' + styles.button + '\' href="' + escapeHtmlAttribute(re_ping_command) + '">Re-Ping</a>';
                        showDialog('Hint Delivered', message, 'GM');
                    }
                }
                if (players.length) {
                    sendPing(location_token.get('left'), location_token.get('top'), location_token.get('pageid'), null, true, players);
                } else {
                    showDialog('Hint Error', 'You must provide a hint message and at least one valid recipient.', 'GM');
                }
            } else {
                showDialog('Hint Error', 'You must provide a hint message and at least one valid recipient.', 'GM');
            }
        } else  {
            showDialog('Hint Error', 'You must select a valid token.', 'GM');
        }
	},

    commandHelp = function () {
        // Show help dialog
        var message = 'Command format:<br>';
        message += '<div style=\'' + styles.code + '\'>!hint --msg|&lt;message_text&gt; --to|&lt;character_names&gt;</div>';
        message += '<div style=\'' + styles.code + '\'>!hint --msg|&lt;message_text&gt; --player|&lt;player_names&gt;</div>';
        message += '<div style=\'' + styles.code + '\'>!hint --msg|&lt;message_text&gt; --token|&lt;token_names&gt;</div>';
        message += '<b style=\'' + styles.code + '\'>&lt;message_text&gt;:</b><br>The text of your message. No double dashes allowed.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;character_names&gt;:</b><br>Comma-delimited list of character names. May be partial names. Capitalization ignored.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;player_names&gt;:</b><br>Comma-delimited list of player display names. May be partial names. Capitalization ignored.<br><br>';
        message += '<b style=\'' + styles.code + '\'>&lt;token_names&gt;:</b><br>Comma-delimited list of token names on the current page. If a token represents a character, the character controllers are used first.<br><br>';
        message += 'You <b>must</b> have a token selected for the ping location reference.<br><br>';
        message += 'See the <a style="' + styles.textButton + '" href="https://github.com/blawson69/Hint">documentation</a> for complete instructions.';
        showDialog('Help Menu', message, 'GM');
    },

    getCharacterIDsFromNames = function (names) {
        var chars = [];
        var allChars = findObjs({type: 'character', archived: false}, {caseInsensitive: true});
        _.each(names, function (name) {
            var char = _.find(allChars, function (x) { return x.get('name').toLowerCase().search(name.toLowerCase()) > -1; });
            if (char) chars.push(char.get('id'));
        });
        return chars;
    },

    getPlayerIDsFromNames = function (names) {
        var players = [];
        var allPlayers = findObjs({type: 'player'});
        _.each(names, function (name) {
            var player = _.find(allPlayers, function (x) { return x.get('_displayname').toLowerCase().search(name.toLowerCase()) > -1; });
            if (player) players.push(player.get('id'));
        });
        return players;
    },

    getPlayerIDsFromTokens = function (names, page_id) {
        var tokens = findObjs({type: 'graphic', subtype: 'token', pageid: page_id}, {caseInsensitive: true});
        var players = [];
        _.each(names, function (name) {
            var token = _.find(tokens, function (x) { return x.get('name').toLowerCase().search(name.toLowerCase()) > -1; });
            if (token) players = players.concat(getControlledPlayerIDsFromToken(token));
        });
        return players;
    },

    getControlledPlayerIDsFromToken = function (token) {
        var represented = token.get('represents');
        if (represented) {
            var char = getObj('character', represented);
            if (char) return getControlledPlayerIDs(char);
        }
        return getControlledPlayerIDs(token);
    },

    getControlledPlayerIDs = function (obj) {
        var controlled_by = obj && obj.get('controlledby');
        if (!controlled_by || controlled_by == 'all') return [];
        return controlled_by.split(',');
    },

    getNameFromID = function (char_id) {
        var name = 'Unknown Character', char = getObj('character', char_id);
        if (char) name = char.get('name');
        return name;
    },

    getPlayerNameFromID = function (player_id) {
        var player = getObj('player', player_id);
        return player ? player.get('_displayname') : '';
    },

    getRePingCommand = function (hint, players, location_id) {
        return '!hint --msg|' + hint + ' --visibleto|' + players.join(',') + ' --location|' + location_id + ' --re-ping';
    },

    escapeHtmlAttribute = function (text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

	grammaticallyCorrect = function (names) {
		// Return a pretty (grammatically speaking) string of names for dialog
		var result = '', joiner = ' ';
		if (names.length > 1) names[names.length-1] = 'and ' + names[names.length-1];
		if (names.length > 2) joiner = ', '
		result = names.join(joiner);
		return result;
	},

    showDialog = function (title, content, whisperTo = '') {
        // Outputs a pretty box in chat with a title and content
        var gm = /\(GM\)/i;
        var whisperTarget = whisperTo;
        title = (title == '') ? '' : '<div style=\'' + styles.title + '\'>' + title + '</div>';
        var body = '<div style=\'' + styles.box + '\'>' + title + '<div>' + content + '</div></div>';
        if (whisperTo.length > 0) {
            whisperTo = '/w ' + (gm.test(whisperTo) ? 'GM' : '"' + whisperTo + '"') + ' ';
            sendChat('Hint', whisperTo + body, null, {noarchive: gm.test(whisperTarget)});
        } else  {
            sendChat('Hint', body);
        }
    },

    //---- PUBLIC FUNCTIONS ----//

    registerEventHandlers = function () {
		on('chat:message', handleInput);
	};

    return {
		checkInstall: checkInstall,
		registerEventHandlers: registerEventHandlers
	};
}());

on("ready", function () {
    Hint.checkInstall();
    Hint.registerEventHandlers();
});
