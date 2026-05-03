# Hint
Hint is a [Roll20](http://roll20.net/) script that allows the GM to send a hint to designated characters, players, or token controllers along with a ping to a map location. As an example, you can whisper the message "You notice a loose tile..." to every player whose character has a high enough passive Perception check to discover your trap, and only those players will see a ping in the location of said tile.

This script takes advantage of the `visibleTo` parameter of the [sendPing API function](https://wiki.roll20.net/API:Utility_Functions#Miscellaneous) to only ping the players who control those characters.

## Use

Place a token in the location where you want the ping to originate. This can be any graphic, including a transparent one. Select this token and send the `!hint` command along with the necessary parameters. Format your command thus:
```
!hint --msg|<message-text> --to|<character-names>
!hint --msg|<message-text> --player|<player-names>
!hint --msg|<message-text> --token|<token-names>
```

The Hint script will ping the designated players, and will move the map to the location of the ping for each of them as well (as if long-clicking with the Shift key depressed). Players who are not targeted by the command will see neither the ping nor the whispered message.

### Which Should I Use?

--to: This selects which character *in the journal* will get the ping. This **only** works with characters in the journal. Case **in**sensitive.  

--player: The player name that will get the ping.  Case **in**sensitive.   

--token: Which token(s) with that name get the ping.   Case **in**sensitive. **This can match unintended targets if you're not careful.** 

Multiple targets *of the same type* can be specified by comma separating them.  For example:

```
!hint --msg|test --player|Uriel,Steven,Kaliea
!hint --msg|test --token|Zeren,Dormi Somatk,Stoneward,Karth
```

### Dynamically Choosing Recipients And Messages

You can configure it to query you for a hint message as well (with a fallback default) by making the message section look like this:

```
--msg|?{Hint message|There's noise here.} 
```

The same goes for recipients (I would *not* use this with --token, due to the possibility of mismatch): 

```
--player|?{Recipient player name|Steven}
--to|?{Recipient character name|Soldier}
```

### Using It With A Macro

Create a macro with the *same text* you would use if typing the command.  You want to select "Show as Token Action" so you don't forget that you have to select something first.  

![2026-05-03_12.05.48](https://i.imgur.com/hu0B60n.png)

### Message

The text that follows `--msg|` can contain normal punctuation, but should avoid double dashes (--). This message will be whispered to each player that controls a character whose name you provide. Because of the intended use of the script, it will ignore characters who are controlled by all players.

The GM will receive a whisper with the original message and a list of the proper character names to whom the message was whispered.

### Character Names
The character names is a comma-delimited list of names that follows the `--to|` parameter. These names can be shortened versions of the character's full name as long as it contains part of the name. Capitalization does not matter. For instance, passing "bron" will match a character with the name 'Bronan the Destroyer'.

Be careful that you don't pass a name fragment that will match for multiple characters, as the script will only take the first match and other matches will be ignored. Sending the name "cor" will match both "Rancor the Pungent" and "Albacore the Tuna" but will only use the first match for the hint message/ping.

### Player Names
The player names is a comma-delimited list of display names that follows the `--player|` parameter. These names can be shortened versions of the player's display name, and capitalization does not matter.

### Token Names
The token names is a comma-delimited list of token names on the current page that follows the `--token|` parameter. These names can be shortened versions of the token's name, and capitalization does not matter.

If a token represents a character, Hint uses that character's `controlledby` list first. Otherwise it falls back to the token's own `controlledby` list. This matches the common Roll20 setup where the controlling players are stored on the represented character rather than the token itself.

### Re-Pinging
The message received by the GM will contain a "Re-Ping" button that will allow you to re-send a ping to the players. This is helpful for when a player forgot the location of the ping or somehow missed seeing the original. You just know it'll happen. The button stores the original ping token, so if that token moves before you click Re-Ping, the new ping will follow its updated position.

## Help
Sending `!hint` with no parameters will display a Help dialog to the GM with simple directions for using the script.
