#!/usr/bin/env Rscript
require(quantmod)
# args = commandArgs(trailingOnly=TRUE)
args <- c("2020-01-01", "2020-07-15", "2020-07-15", "GGBR4", "KLBN11", "AZUL4")
date_start = args[1]
date_end   = args[2]
date_norm  = args[3]
symbols = args[4:length(args)]

filenames=sprintf("data/data_%s", symbols)

time_bins = as.numeric(as.Date(date_end) - as.Date(date_start)) + 1


value_range = c(1,1)
tables = list()
for (i in 1:length(symbols)) {
	t <- read.table(filenames[i],sep="|",header=T)
	names(t) <- c("symbol","date","open","high","low","close","volume","adjusted")
	t$date <- as.character(t$date)
	t <- t[t$date >= date_start  & t$date <= date_end,]
	t <- data.frame(t, offset=as.numeric(as.Date(t$date) - as.Date(date_start)))
	norm_row <- min(which(t$date >= date_norm))
	t <- data.frame(t, value=t$close / t$close[norm_row])
	t <- t[!is.na(t$value), ]
	value_range <- range(c(value_range), t$value)
	tables[[symbols[i]]] = t
}

# pdf("tmp.pdf",width=8,height=8,pointsize=8)
par(mar=c(5,4,4,1))
plot(0,type="n",ylab="",xlab="",xlim=c(0,time_bins-1),ylim=value_range,axes=F,main=sprintf("prices relative to date %s", date_norm))
#
# ,xaxs="i"
# ,yaxs="i"
#
yticks = pretty(value_range,n=8)
xticks = pretty(0:(time_bins-1),n=9)
abline(v=xticks,col=gray(0.8))
abline(h=yticks,col=gray(0.8))
lapply(1:length(tables), function(i) {
	t <- tables[[i]]
	lines(t$offset, t$value, col=i, pch=16, cex=0.6)
})
axis(1,xticks,labels=(as.Date(date_start) + xticks),las=2,cex.axis=0.65)
axis(2,yticks,labels=sprintf("%.2f",yticks),las=2,cex.axis=0.8)
box()
legend("bottomleft",names(tables),col=1:length(tables),pch=16,cex=0.6)

# def.off()

