#!/bin/bash
python3 -m http.server 8887 &
python3 ts_server.py
