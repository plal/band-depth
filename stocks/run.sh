#!/bin/bash

if [ "$1" == "start" ]; then 
	if [ -f .tmp_server_ids ]; then
		echo "Servers already started. Run 'stop' first"
	else
		python3 ts_server.py -d ../data/nba/nba_players_1819 1>>log_data_server_stdout.txt 2>>log_data_server_sterr.txt &
		DATA_SERVER_ID=$!
		python3 -m http.server 44444 1>>log_page_server_stdout.txt 2>>log_page_server_sterr.txt &
		PAGE_SERVER_ID=$!
		echo "DATA Server Started on port 8888"
		echo "PAGE Server Started on port 44444"
		echo "DATA|$DATA_SERVER_ID" >> .tmp_server_ids
		echo "PAGE|$PAGE_SERVER_ID" >> .tmp_server_ids
	fi
fi

if [ "$1" == "stop" ]; then
	if [ -f ".tmp_server_ids" ]; then
		for record in $(cat .tmp_server_ids | paste -d ' ' -s -); do
			name=$(echo $record | cut -f 1 -d'|')
			id=$(echo $record | cut -f 2 -d'|')
			echo "Stopping $name server process $id"
			kill -9 $id
		done
		rm .tmp_server_ids
	fi
fi
