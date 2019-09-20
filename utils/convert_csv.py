import re
import os

import argparse
import pandas as pd

from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("-i", "--input", required=True,
	            help="Path to .csv file")
args = vars(ap.parse_args())

data = pd.read_csv(args["input"])

output_path = "../data/"

if not os.path.exists(output_path):
    os.makedirs(output_path)

output_name = Path(args["input"]).stem + ".txt"
output      = output_path + output_name

with open(args["input"]) as infile, open(output, "w") as outfile:
    outfile.write(str(data.shape[0]) + " " + str(data.shape[1]) + "\n")
    next(infile)
    for line in infile:
        outfile.write(re.sub(r"\s*,\s*", " ", line))
