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

from urllib.parse import unquote
import http.server

# I hate this extra dependency, but whatever for now...
# import simplejson as json
import argparse
import json
import os

ts_server = None

# c_SYMBOL,c_DATE,c_OPEN,c_HIGH,c_LOW,c_CLOSE,c_VOLUME,c_ADJ=range(8)

# Expecting data on format id | date | value1 [| value 2 | ...]*
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--data", required=True, type=str,
                help="Path to data folder")
ap.add_argument("-x", "--xvalues", required=True, type=int,
                help="Column with values to be put in x axis")
ap.add_argument("-y", "--yvalues", required=True, type=int,
                help="Column with values to be put in y axis")
args = vars(ap.parse_args())

c_ID = 0
c_X  = args["xvalues"]
c_Y  = args["yvalues"]

class CustomHTTPHandler(http.server.BaseHTTPRequestHandler):
    # Handler for the GET requests
    def do_GET(self):
        global ts_server
        path = self.path
        # Send the html message
        if path == '/desc':
            result = json.dumps(ts_server.ids).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',len(result))
            self.send_header('Access-Control-Allow-Origin','*')
            self.end_headers()
            self.wfile.write(result)
            self.wfile.flush()
        elif path[0:7] == "/get?p=":
            error = []
            ids=path[7:].split(',')
            id_data = []
            for id in ids:
                id = unquote(id)
                try:
                    x_values  = []
                    y_values = []
                    with open(args["data"]+'/%s' % id,'r') as fp:
                        for line in fp:
                            tokens = line.strip().split('|')
                            try:
                                d = tokens[c_X]
                                v = float(tokens[c_Y])
                                x_values.append(d)
                                y_values.append(v)
                            except:
                                # couldn't parse NA price possibly
                                pass
                    id_data.append( { 'id':id, 'x_values':x_values, 'y_values':y_values } )
                except:
                    error.append(id)
            result = json.dumps({'data': id_data,'error':error}).encode('utf-8')
            # print(result)
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
        self.ids = os.listdir(args["data"])
        self.datasets = []

    def set_datasets(self, datasets_path_list):
        self.datasets = datasets_path_list

if __name__ == "__main__":
    ts_server = TSServer()

    datasets_paths = []
    for root, dirs, files in os.walk('data/'):
        if files != []:
            datasets_paths.append(root)
    ts_server.set_datasets(datasets_paths)

    port = 8888
    server = http.server.HTTPServer(('', port), CustomHTTPHandler)
    print ('Started httpserver on port ' , port)
    server.serve_forever()
