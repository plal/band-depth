#!/bin/bash

#{{{ pack
if [ "$1" == "pack" ]; then
	(echo "name|date|team|points|assists|rebounds|steals|blocks|turnovers|personal_fouls|game_id|position" &&
	(for f in $(find ../data/nba/nba_players_1819 -type f | paste -d' ' -s -); do
		tail -n+2 $f
	done)) > packed_data
fi
#}}}
