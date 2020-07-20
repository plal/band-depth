#
# API
#
# /desc
#      get time series descriptions of everything
#
# /get?p=AAPL,AMZN,FXAIX
#
# data/GGBR4.SA
# data/AAPL
#
import http.server

# I hate this extra dependency, but whatever for now...
# import simplejson as json
import json
import os

# import socketserver
# import http.client
# import concurrent.futures
# import threading
# import re
# import png
# import json
# import traceback
# import math

ts_server = None

c_SYMBOL,c_DATE,c_OPEN,c_HIGH,c_LOW,c_CLOSE,c_VOLUME,c_ADJ=range(8)
 
class CustomHTTPHandler(http.server.BaseHTTPRequestHandler):
    # Handler for the GET requests
    def do_GET(self):
        global ts_server
        path = self.path
        # Send the html message
        if path == '/desc':
            result = json.dumps(ts_server.symbols).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',len(result))
            self.send_header('Access-Control-Allow-Origin','*')
            self.end_headers()
            self.wfile.write(result)
            self.wfile.flush()
        elif path[0:7] == "/get?p=":
            error = []
            symbols=path[7:].split(',')
            symbol_data = []
            for symbol in symbols:
                try:
                    date = []
                    close = []
                    with open('data/%s' % symbol,'r') as fp:
                        for line in fp:
                            tokens = line.strip().split('|')
                            try:
                                d = tokens[c_DATE]
                                c = float(tokens[c_CLOSE])
                                date.append(d)
                                close.append(c)
                            except:
                                # couldn't parse NA price possibly
                                pass
                    symbol_data.append( { 'symbol':symbol, 'date':date, 'close':close } )
                except:
                    error.append(symbol)
            result = json.dumps({'data': symbol_data,'error':error}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',len(result))
            self.send_header('Access-Control-Allow-Origin','*')
            self.end_headers()
            self.wfile.write(result)
            self.wfile.flush()
        else:
            msg="Invalid API"
            self.send_response(200)
            self.send_header('Content-Type','text/plain')
            self.send_header('Content-Length',len(msg))
            self.send_header('Access-Control-Allow-Origin','*')
            self.end_headers()
            self.wfile.write(msg.encode('utf-8'))
            self.wfile.flush()



class TSServer:
    def __init__(self):
        self.symbols = os.listdir('data')

if __name__ == "__main__":
    ts_server = TSServer()
    port = 8888 
    server = http.server.HTTPServer(('', port), CustomHTTPHandler)
    print ('Started httpserver on port ' , port)
    server.serve_forever()

