library(ggplot2)
theme_set(theme_minimal())

data <- read.table('packed_data',header=T,sep="|",quote="")
data <- data[data$game_id<83,]

a.games <- aggregate(rep(1,nrow(data)),by=list(name=data$name),sum)
games.threshold <- 50
p50plus <- sort(a.games$name[a.games$x >= games.threshold])
data <- data[data$name %in% p50plus,]

#
# x    is the matrix of timeseries
# xc   is the matrix of cumulative values of the timeseries
# xcn  is the matrix of cumulative values of the timeseries normalized (accumulates to 1)
#


# compute metric totals by player
a <- aggregate(data$points,by=list(name=data$name),sum)

# select players that have a minimal threshold with respect to 
# the metric 
players <- sort(a$name[a$x > 1000])
num.players <- length(players)
num.games  <- 1+abs(diff(range(data$game_id)))

x               <- matrix(0,ncol=num.games,nrow=num.players)
xc              <- matrix(0,ncol=num.games,nrow=num.players)
xcn             <- matrix(0,ncol=num.games,nrow=num.players)

rownames(x)     <- players
rownames(xc)    <- players
rownames(xcn)   <- players

# fill in points
for (i in 1:num.players) {
	name     <- players[i]
	g        <- data$game_id[data$name == name]
	p        <- data$points[data$name == name]
	x[i,g]   <- p
	pc       <- cumsum(x[i,])
	xc[i,]   <- pc
	xcn[i,]  <- pc/max(pc)
}

#
# emd to the zero curve gives us a certain rank notion for the 
# shape of the season
#
d0 <- rowSums(xcn)
o  <- order(-d0)
r  <- data.frame(rank=1:length(o),name=players[o],d0=d0[o],points=sapply(o,function(i) { xc[i,ncol(xc)] }))
rownames(r) <- c()

p0 <- "Stephen Curry"
p1 <- "Hamidou Diallo"

n <- ncol(x)
x.df   <- data.frame(game=1:n,player=c(rep(p0,n),rep(p1,n)),x=c(x[p0,],x[p1,]))
xc.df  <- data.frame(game=1:n,player=c(rep(p0,n),rep(p1,n)),xc=c(xc[p0,],xc[p1,]))
xcn.df <- data.frame(game=1:n,player=c(rep(p0,n),rep(p1,n)),xcn=c(xcn[p0,],xcn[p1,]))


ggplot(xcn.df, aes(x = game, y = xcn)) + 
  geom_line(aes(color = player, linetype = player)) +
  scale_color_manual(values = c("darkred", "steelblue"))




# Libraries
# library(dplyr)
# p1 <- qplot(game, x, data=x.df) + 
#   geom_line(aes(color = player, linetype = player)) +
#   scale_color_manual(values = c("darkred", "steelblue"))
# 
# p2 <- qplot(game, x, data=xc.df) + 
#   geom_line(aes(color = player, linetype = player)) +
#   scale_color_manual(values = c("darkred", "steelblue"))
# 
# p3 <- qplot(game, x, data=xcn.df) + 
#   geom_line(aes(color = player, linetype = player)) +
#   scale_color_manual(values = c("darkred", "steelblue"))

p1 <- ggplot(x.df, aes(x = game, y = x))+ 
  geom_line(aes(color = player, linetype = player)) +
  scale_color_manual(values = c("darkred", "steelblue"))

p1 <- ggplot(xc.df, aes(x = game, y = xc)) + 
  geom_line(aes(color = player, linetype = player)) +
  scale_color_manual(values = c("darkred", "steelblue"))

p3 <- ggplot(xcn.df, aes(x = game, y = xcn)) + 
  geom_line(aes(color = player, linetype = player)) +
  scale_color_manual(values = c("darkred", "steelblue"))

# p4 <- p1 + p2 + p3
library(gridExtra)
grid.arrange(p1$plot,p2$plot,p3$plot,nrow=1)
grid.arrange(p1,p2,p3,nrow=1)

# ggplot(xcn.df, aes(x = game, y = points)) + 
#   geom_line(aes(color = player, linetype = player)) + 
#   scale_color_manual(values = c("darkred", "steelblue"))







