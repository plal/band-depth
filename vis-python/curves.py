import pandas as pd
import numpy as np
from bokeh.plotting import figure, show, output_file
from bokeh.models import Band, ColumnDataSource, HoverTool, DatetimeTickFormatter
from bokeh.models.annotations import Title

import random

def plot_lines(data_file, output_file, depth_type, start_date, end_date, num_outliers, use_top50=False):
    data = pd.read_csv(data_file)
    data = data.set_index(pd.date_range(start=start_date, end=end_date).date)
    data = data.transpose()
    data = data.set_index(pd.date_range(start=start_date, periods=24, freq='H').time)

    data_outputs = pd.read_csv(output_file).set_index(pd.date_range(start=start_date, end=end_date).date)

    data_outputs = data_outputs.transpose()

    data_final = pd.concat([data,data_outputs])

    data_final = data_final.sort_values(by=depth_type,axis=1)
    #data_final.loc['tmd',:]

    data_outliers = data_final.iloc[:,:num_outliers]
    data_median   = data_final.iloc[:,data_final.shape[1]-1]
    if use_top50:
        data_top50    = data_final.iloc[:,(data_final.shape[1]//2):data_final.shape[1]-1]
        data_ordered  = pd.concat([data_top50, data_outliers, data_median], axis=1)
    else:
        data_middle   = data_final.iloc[:,num_outliers:data_final.shape[1]-1]
        data_ordered  = pd.concat([data_middle, data_outliers, data_median], axis=1)
    print(data_ordered.shape)

    #color_list = list(data_final.loc["color",:])
    color_top50 = ["#fbb4b9"] * (data_ordered.shape[1] - (num_outliers+1))
    color_median = ["Blue"]
    color_outliers = ["Red"] * num_outliers
    color_list = color_top50 + color_outliers + color_median
    #print(len(color_list))

    alpha_list = [0.5] * data_final.shape[1]
    alpha_list[0:num_outliers] = [1] * num_outliers
    alpha_list[len(alpha_list)-1] = 1

    numlines = len(data_ordered.columns)

    p = figure(width=1000, height=800, x_axis_type="datetime")
    p.multi_line(xs=[data_ordered.index.values]*numlines,
                 ys=[data_ordered[name].values for name in data_ordered.iloc[0:24]],
                 line_color=color_list,
                 line_width=5)
    return p
