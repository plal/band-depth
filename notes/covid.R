library(ggplot2)
library(RColorBrewer)
theme_set(theme_minimal())

data <- read.table('../covid/states.psv',header=T,sep="|",quote="")
names(data)[1] <- "n"

states <- sort(unique(data$state))
n_states <- length(states)

#
# x    is the matrix of timeseries
# xc   is the matrix of cumulative values of the timeseries
# xcn  is the matrix of cumulative values of the timeseries normalized (accumulates to 1)
#
n_max   <- max(data$n)
n_slots <- n_max + 1

x   <- matrix(0,ncol=n_slots,nrow=length(states))
xc  <- matrix(0,ncol=n_slots,nrow=length(states))
xcn <- matrix(0,ncol=n_slots,nrow=length(states))
rownames(x)     <- states
rownames(xc)    <- states
rownames(xcn)   <- states

# fill in points
for (i in 1:n_states)
{
	state     <- states[i]
	g         <- data$n[data$state == state]
	pc        <- data$deaths[data$state == state]
	xc[i,g]   <- pc
	v         <- xc[i,]
	for (j in 2:ncol(xc)) {
		if (v[j] < v[j-1]) {
			v[j] <- v[j-1]
		}
	}
	xc[i,] <- v
	x[i,] <- diff(c(0,xc[i,]))
	xcn[i,]  <- v/max(v)
}

#
# emd to the zero curve gives us a certain rank notion for the 
# shape of the season
#
d0 <- rowSums(xcn)
o  <- order(-d0)
r  <- data.frame(rank=1:length(o),state=states[o],d0=d0[o],deaths=sapply(o,function(i) { xc[i,ncol(xc)] }))
rownames(r) <- c()

x <- rep(0:n_max,each=length(states))
y <- rep(states,times=n_slots)
a <- as.numeric(xcn)
xcn.df <- data.frame(state=states, day=x, deaths_cn=a)


rename_table <- data.frame(deaths=xc[,ncol(xc)])

# new_names <- sprintf("%s (%d)",rownames(rename_table), rename_table$deaths)

selection = states
#sort(c("New York", "New Jersey", "California", "Washington", "Florida"))

ggplot(xcn.df[xcn.df$state %in% selection,], aes(x = day, y = deaths_cn)) + 
  geom_line(aes(color = state),size=1.25) +
  scale_color_brewer(palette="Set1",name = "Dose", labels = sprintf("%s (%d)", selection, rename_table[selection,]))


 +
 +
  scale_fill_discrete(name = "Dose", labels = c("A", "B", "C", "D", "E", "F"))







  scale_color_manual(values = c("darkred", "steelblue","purple"))

p0 <- "New York"
p1 <- "Texas"
p2 <- "California"

n <- ncol(x)
x.df   <- data.frame(day=1:n,state=c(rep(p0,n),rep(p1,n),rep(p2,n)),x  =c(  x[p0,],  x[p1,],  x[p2,]))
xc.df  <- data.frame(day=1:n,state=c(rep(p0,n),rep(p1,n),rep(p2,n)),xc =c( xc[p0,], xc[p1,], xc[p2,]))
xcn.df <- data.frame(day=1:n,state=c(rep(p0,n),rep(p1,n),rep(p2,n)),xcn=c(xcn[p0,],xcn[p1,],xcn[p2,]))






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







