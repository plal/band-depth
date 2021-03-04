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

from sklearn.manifold import TSNE
from urllib.parse import unquote
import http.server

# I hate this extra dependency, but whatever for now...
# import simplejson as json
import base64
import argparse
import numpy as np
import json
import os

def emd_np(ac, bc):
    return np.sum(np.abs(ac-bc))

def build_dissimilarity_matrix(players, data):
    numPlayers = len(players)
    dissimilarityMatrix = np.zeros((numPlayers,numPlayers))
    for i in range(numPlayers):
        pi = players[i]
        ai = np.array(data[pi])
        for j in range(i+1,numPlayers):
            pj = players[j]
            aj = np.array(data[pj])
            dist = emd_np(ai, aj)
            dissimilarityMatrix[i][j] = dist
            dissimilarityMatrix[j][i] = dist

    return dissimilarityMatrix

ts_server = None

# c_SYMBOL,c_DATE,c_OPEN,c_HIGH,c_LOW,c_CLOSE,c_VOLUME,c_ADJ=range(8)

# Expecting data on format id | date | value1 [| value 2 | ...]*
ap = argparse.ArgumentParser()
ap.add_argument("-d", "--data", required=True, type=str,
                help="Path to data folder")
args = vars(ap.parse_args())

c_NAME,c_DATE,c_TEAM,c_POINTS,c_ASSISTS,c_REBOUNDS,c_STEALS,c_BLOCKS,c_TURNOVERS,c_FOULS,c_GAMEID, c_POSITION = range(12)

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
                    teams = []
                    dates = []
                    pts   = []
                    asts  = []
                    rbds  = []
                    stls  = []
                    blcks = []
                    tos   = []
                    fouls = []
                    gids  = []

                    with open(args["data"]+'/%s' % id,'r') as fp:
                        next(fp)
                        for line in fp:
                            tokens = line.strip().split('|')
                            try:
                                teams.append(tokens[c_TEAM])
                                dates.append(tokens[c_DATE])
                                pts.append(int(tokens[c_POINTS]))
                                asts.append(int(tokens[c_ASSISTS]))
                                rbds.append(int(tokens[c_REBOUNDS]))
                                stls.append(int(tokens[c_STEALS]))
                                blcks.append(int(tokens[c_BLOCKS]))
                                tos.append(int(tokens[c_TURNOVERS]))
                                fouls.append(int(tokens[c_FOULS]))
                                gids.append(tokens[c_GAMEID])
                                position = tokens[c_POSITION]
                            except:
                                pass

                    id_data.append( { 'id':id, 'position':position, 'teams':teams, 'dates':dates, 'points':pts, 'assists':asts, 'rebounds':rbds,
                                      'steals':stls, 'blocks':blcks, 'turnovers':tos, 'fouls':fouls, 'game_ids':gids } )
                except:
                    error.append(id)
            result = json.dumps({'data': id_data,'error':error}).encode('utf-8')
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

    def do_POST(self):
        global ts_server
        path = self.path

        if path == '/project':
            #handling request and reading data
            content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
            post_data = self.rfile.read(content_length) # <--- Gets the data itself
            data_bytes = base64.b64decode(post_data)
            data_string = unquote(data_bytes.decode("utf-8"))
            data = json.loads(data_string)

            #tsne-emd stuff
            players = list(data.keys())
            dmatrix = build_dissimilarity_matrix(players, data)
            tsne = TSNE(n_components=2,perplexity=5,metric='precomputed',n_iter=5000)
            projTSNEEMD5 = tsne.fit_transform(dmatrix)
            print("Iterations: " + str(tsne.n_iter_) + " // Divergence: " + str(tsne.kl_divergence_))

            proj_data = {}
            for i in range(len(players)):
                proj_data[players[i]] = [float(projTSNEEMD5[i][0]), float(projTSNEEMD5[i][1])]

            #send response
            result = json.dumps(proj_data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',len(result))
            self.send_header('Access-Control-Allow-Origin','*')
            self.end_headers()
            self.wfile.write(result)
            self.wfile.flush()

class TSServer:
    def __init__(self):
        self.ids = os.listdir(args["data"])
        self.datasets = []


if __name__ == "__main__":
    ts_server = TSServer()

    port = 8888
    server = http.server.HTTPServer(('', port), CustomHTTPHandler)
    print ('Started httpserver on port ' , port)
    server.serve_forever()
