from basketball_reference_web_scraper import client
from basketball_reference_web_scraper.data import OutputType

import pandas as pd

days   = range(1,32)
months = [1,2,3,4,5,6,9,10,11,12]
years  = [1995,1996]

def format_number(number):
    if len(str(number)) == 1:
        return "0"+str(number)
    return str(number)

for year in years:
    for month in months:
        for day in days:
            date = str(year)+'-'+format_number(month)+'-'+format_number(day)
            data = client.player_box_scores(day=day,month=month,year=year)
            if data != []:
                for player in data:
                    player["date"] = date

                df = pd.DataFrame(data)
                fname = "nba_1995_1996/nba_player_stats_"+date+'.csv'
                df.to_csv(fname,sep='|',index=False)
