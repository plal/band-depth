#
# naive
#
M = matrix(runif(12),nrow=3)
n <- ncol(M)
count <- matrix(0,ncol=1,nrow=nrow(M))
for (i in 1:(n-1)) {
	for (j in (i+1):n) {
		for (k in 1:n) {
# i <- 1
# j <- 2
# k <- 3
			check <- (M[,i] <= M[,k]) & (M[,k] <= M[,j])
			count <- count + check
		}
	}
}
depth <- count / choose(n,2)

