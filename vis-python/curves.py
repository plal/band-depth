import pandas as pd
import numpy as np
from bokeh.plotting import figure, show, output_file
from bokeh.models import Band, ColumnDataSource, HoverTool, DatetimeTickFormatter
from bokeh.models.annotations import Title

import random

def prepare_data(data_file, output_file, start_date, end_date, periods, index_days=None):
    data = pd.read_csv(data_file)
    if index_days:
        print(a)
    else:
        data = data.set_index(pd.date_range(start=start_date, end=end_date).date)
    data = data.transpose()
    data = data.set_index(pd.date_range(start=start_date, periods=periods, freq='H').time)

    data_outputs = pd.read_csv(output_file).set_index(pd.date_range(start=start_date, end=end_date).date)
    data_outputs = data_outputs.transpose()

    data_final   = pd.concat([data,data_outputs])
    return data_final

    
def get_color_from_depth(depth, quantiles):

    if depth <= quantiles[0]: return '#fef0d9'
    if depth <= quantiles[1]: return '#fdcc8a'
    if depth <= quantiles[2]: return '#fc8d59'
    if depth  > quantiles[2]: return '#d7301f'

def plot_lines(data_file, output_file, depth_type, start_date, end_date, periods, depth_color=False):
    data_final   = prepare_data(data_file, output_file, start_date, end_date, periods)
    data_final   = data_final.sort_values(by=depth_type,axis=1)

    print(data_final.shape)

    color_list = []
    if depth_color:
        depth_list = data_final.loc[depth_type].tolist()
        quantiles  = data_final.loc[depth_type].quantile([0.25,0.5,0.75]).values
        color_list = [get_color_from_depth(depth, quantiles) for depth in depth_list]

    else:
        for i in range(data_final.shape[1]):
          color_list.append("#{:06x}".format(random.randint(0, 0xFFFFFF)))

    numlines = len(data_final.columns)

    p = figure(width=500, height=400, x_axis_type="datetime")
    p.multi_line(xs=[data_final.index.values]*numlines,
                 ys=[data_final[name].values for name in data_final.iloc[0:24]],
                 line_color=color_list,
                 line_width=5)
    
    return data_final, p


def get_envelopes(data_top50):
    df_max = data_top50.max(axis=1)
    df_min = data_top50.min(axis=1)

    iqr = df_max - df_min
    mid = (df_max + df_min)//2
    out_top = mid + (0.75*iqr)
    out_bot = mid - (0.75*iqr)

    return pd.concat({'top':df_max,'bot':df_min,'out_top':out_top,'out_bot':out_bot},axis=1)

def get_outliers(raw_outliers, data_envelopes):
    data_outliers = pd.DataFrame()
    for col in raw_outliers.columns:
        if (raw_outliers[col][:24] > data_envelopes['out_top'][:24]).any() or (raw_outliers[col][:24] < data_envelopes['out_bot'][:24]).any():
            data_outliers = pd.concat([data_outliers,raw_outliers[col]],axis=1)
    return data_outliers

def functional_boxplot(data_file, output_file, start_date, end_date, periods, depth_type):
    data_final   = prepare_data(data_file, output_file, start_date, end_date, periods)
    data_final   = data_final.sort_values(by=depth_type,axis=1)

    data_median    = data_final.iloc[:,data_final.shape[1]-1]
    data_top50     = data_final.iloc[:,(data_final.shape[1]//2):data_final.shape[1]-1]
    data_envelopes = get_envelopes(data_top50)
    data_inner_envelopes = data_envelopes[['bot','top']]
    data_outer_envelopes = data_envelopes[['out_bot','out_top']]
    raw_outliers   = data_final.iloc[:,:(data_final.shape[1]//2)]
    data_outliers  = get_outliers(raw_outliers,data_envelopes)
    data_top_outliers = data_outliers.iloc[:,:5]
    data_outliers.drop(data_outliers.iloc[:,:5], inplace=True, axis=1)

    print(data_outliers.shape)
    print(data_top_outliers.shape)

    data_ordered   = pd.concat([data_inner_envelopes,data_outliers,data_median],axis=1)
    #print(data_ordered.shape)

    color_inner_envelopes = ["#cccccc","#cccccc"]
    color_outliers = ["#fcbba1"]*(data_outliers.shape[1])
    color_median = ["black"]
    colors_general = color_inner_envelopes + color_outliers + color_median

    numlines_general = len(data_ordered.columns)


    colors_outer_envelopes = ["#969696","#969696"]
    numlines_outer_envelopes = len(data_outer_envelopes.columns)


    colors_top_outliers = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00']
    numlines_top_outliers = len(data_top_outliers.columns)
    print(pd.to_datetime(data_top_outliers.columns))

    p = figure(width=1000, height=800, x_axis_type="datetime")

    upper_band = np.array(data_envelopes['top'].iloc[0:24])
    lower_band = np.array(data_envelopes['bot'].iloc[0:24])
    x          = np.array(data_ordered.index[0:24])

    xs = np.concatenate([x, x[::-1]])
    ys = np.concatenate([lower_band, upper_band[::-1]])

    p.patch(x=xs, y=ys, fill_color="#cccccc", fill_alpha=0.8, line_alpha=0, legend="IQR")

    src_outer_envelopes = ColumnDataSource(data={
        'xs_outer_envelopes': [data_outer_envelopes.index.values]*numlines_outer_envelopes,
        'ys_outer_envelopes': [data_outer_envelopes[name].values for name in data_outer_envelopes.iloc[0:24]],
        'colors_outer_envelopes':colors_outer_envelopes,
        'dates':data_outer_envelopes.columns.astype(str)
    })

    p.multi_line('xs_outer_envelopes',
                 'ys_outer_envelopes',
                 source=src_outer_envelopes,
                 line_color='colors_outer_envelopes',
                 line_width=5,
                 line_dash='dashed')

    src_general = ColumnDataSource(data={
        'xs_general': [data_ordered.index.values]*numlines_general,
        'ys_general': [data_ordered[name].values for name in data_ordered.iloc[0:24]],
        'colors_general': colors_general,
        'dates':data_ordered.columns.astype(str)
    })

    p.multi_line('xs_general',
                 'ys_general',
                 source=src_general,
                 line_color='colors_general',
                 line_width=5,
                 line_alpha=0.6,
                 hover_line_color='colors_general',
                 hover_line_alpha=1.0)

    src_top_outliers = ColumnDataSource(data={
        'xs_top_outliers': [data_top_outliers.index.values]*numlines_top_outliers,
        'ys_top_outliers': [data_top_outliers[name].values for name in data_top_outliers.iloc[0:24]],
        'colors_top_outliers': colors_top_outliers,
        'dates': data_top_outliers.columns.astype(str)
    })

    p.multi_line('xs_top_outliers',
                 'ys_top_outliers',
                 source=src_top_outliers,
                 line_color='colors_top_outliers',
                 line_width=5,
                 line_alpha=0.6,
                 hover_line_color='colors_top_outliers',
                 hover_line_alpha=1.0,
                 legend='dates',)

    p.legend.location = 'bottom_right'
    p.legend.background_fill_alpha = 0.5

    p.title.text_font_size = '20pt'

    p.xaxis.major_label_text_font_size = "18pt"
    p.xaxis.formatter = DatetimeTickFormatter(days="%H:%M",hours="%H:%M")
    p.yaxis.major_label_text_font_size = "18pt"

    p.add_tools(HoverTool(show_arrow=False, line_policy='next', tooltips=[
        ('Date', '@dates'),
    ]))

    return p

def split_datasets(data_file, output_file, start_date, end_date, periods):

    data_aux = prepare_data(data_file, output_file, start_date, end_date, periods)

    aux = []
    for col in data_aux.columns:
        aux.append(col.isoweekday())

    data_aux = data_aux.transpose()
    data_aux["weekday"] = aux
    data_weekends = data_aux.loc[data_aux["weekday"] > 5].drop("weekday",axis=1).transpose()
    data_weekdays = data_aux.loc[data_aux["weekday"] < 6].drop("weekday",axis=1).transpose()
    return data_weekdays, data_weekends

def functional_boxplot_from_df(data, depth_type, title):

    data_final   = data.sort_values(by=depth_type,axis=1)

    data_median    = data_final.iloc[:,data_final.shape[1]-1]
    data_top50     = data_final.iloc[:,(data_final.shape[1]//2):data_final.shape[1]-1]
    data_envelopes = get_envelopes(data_top50)
    data_inner_envelopes = data_envelopes[['bot','top']]
    data_outer_envelopes = data_envelopes[['out_bot','out_top']]
    raw_outliers   = data_final.iloc[:,:(data_final.shape[1]//2)]
    data_outliers  = get_outliers(raw_outliers,data_envelopes)
    data_top_outliers = data_outliers.iloc[:,:5]
    data_outliers.drop(data_outliers.iloc[:,:5], inplace=True, axis=1)

    print(data_outliers.shape)
    print(data_top_outliers.shape)

    data_ordered   = pd.concat([data_inner_envelopes,data_outliers,data_median],axis=1)
    #print(data_ordered.shape)

    color_inner_envelopes = ["#cccccc","#cccccc"]
    color_outliers = ["#fcbba1"]*(data_outliers.shape[1])
    color_median = ["black"]
    colors_general = color_inner_envelopes + color_outliers + color_median

    numlines_general = len(data_ordered.columns)


    colors_outer_envelopes = ["#969696","#969696"]
    numlines_outer_envelopes = len(data_outer_envelopes.columns)


    colors_top_outliers = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00']
    numlines_top_outliers = len(data_top_outliers.columns)
    print(pd.to_datetime(data_top_outliers.columns))

    p = figure(width=1000, height=800, x_axis_type="datetime", title=title)

    upper_band = np.array(data_envelopes['top'].iloc[0:24])
    lower_band = np.array(data_envelopes['bot'].iloc[0:24])
    x          = np.array(data_ordered.index[0:24])

    xs = np.concatenate([x, x[::-1]])
    ys = np.concatenate([lower_band, upper_band[::-1]])

    p.patch(x=xs, y=ys, fill_color="#cccccc", fill_alpha=0.8, line_alpha=0, legend="IQR")

    src_outer_envelopes = ColumnDataSource(data={
        'xs_outer_envelopes': [data_outer_envelopes.index.values]*numlines_outer_envelopes,
        'ys_outer_envelopes': [data_outer_envelopes[name].values for name in data_outer_envelopes.iloc[0:24]],
        'colors_outer_envelopes':colors_outer_envelopes,
        'dates':data_outer_envelopes.columns.astype(str)
    })

    p.multi_line('xs_outer_envelopes',
                 'ys_outer_envelopes',
                 source=src_outer_envelopes,
                 line_color='colors_outer_envelopes',
                 line_width=5,
                 line_dash='dashed')

    src_general = ColumnDataSource(data={
        'xs_general': [data_ordered.index.values]*numlines_general,
        'ys_general': [data_ordered[name].values for name in data_ordered.iloc[0:24]],
        'colors_general': colors_general,
        'dates':data_ordered.columns.astype(str)
    })

    p.multi_line('xs_general',
                 'ys_general',
                 source=src_general,
                 line_color='colors_general',
                 line_width=5,
                 line_alpha=0.6,
                 hover_line_color='colors_general',
                 hover_line_alpha=1.0)

    src_top_outliers = ColumnDataSource(data={
        'xs_top_outliers': [data_top_outliers.index.values]*numlines_top_outliers,
        'ys_top_outliers': [data_top_outliers[name].values for name in data_top_outliers.iloc[0:24]],
        'colors_top_outliers': colors_top_outliers,
        'dates': data_top_outliers.columns.astype(str)
    })

    p.multi_line('xs_top_outliers',
                 'ys_top_outliers',
                 source=src_top_outliers,
                 line_color='colors_top_outliers',
                 line_width=5,
                 line_alpha=0.6,
                 hover_line_color='colors_top_outliers',
                 hover_line_alpha=1.0,
                 legend='dates',)

    p.legend.location = 'bottom_right'
    p.legend.background_fill_alpha = 0.5

    p.title.text_font_size = '20pt'

    p.xaxis.major_label_text_font_size = "18pt"
    p.xaxis.formatter = DatetimeTickFormatter(days="%H:%M",hours="%H:%M")
    p.yaxis.major_label_text_font_size = "18pt"

    p.add_tools(HoverTool(show_arrow=False, line_policy='next', tooltips=[
        ('Date', '@dates'),
    ]))

    return p
