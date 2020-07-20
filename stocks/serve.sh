#!/bin/bash
python3 -m http.server 8888 &
python3 ts_server.py &
