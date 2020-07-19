# symbol date_start
cat <<'EOF' > pull_symbol
#!/usr/bin/env Rscript
require(quantmod)
args = commandArgs(trailingOnly=TRUE)
input_symbol = args[1]
input_from = as.Date(args[2])
x <- as.data.frame(quantmod::getSymbols(input_symbol, src ="yahoo", from=input_from, auto.assign=F))
colnames(x) <- c("open","high","low","close","volume","adj")
x <- data.frame(symbol=input_symbol, date=rownames(x), x)
write.table(x,sep="|",quote=F,row.names=F)
EOF
chmod +x pull_symbol

cat <<'EOF' | tr ' ' '\n' > tmp_bvsp_symbols
ABEV3 AZUL4 BTOW3 B3SA3 BBAS3 BBSE3 BBDC3 BBDC4 BRAP4 BRML3 BRKM5 BRFS3 BPAC11
CRFB3 CCRO3 CVCB3 CMIG4 HGTX3 CIEL3 COGN3 CSAN3 CPFE3 CSNA3 CYRE3 ECOR3 ENBR3
ELET3 ELET6 EMBR3 EGIE3 EQTL3 GGBR4 GOLL4 PCAR4 FLRY3 HAPV3 HYPE3 IGTA3 GNDI3
IRBR3 ITUB4 ITSA4 JBSS3 KLBN11 RENT3 LAME4 LREN3 MGLU3 MRFG3 GOAU4 BEEF3 MRVE3
MULT3 NTCO3 PETR3 PETR4 QUAL3 RADL3 RAIL3 SBSP3 SANB11 SULA11 SUZB3 TAEE11
VIVT4 TIMP3 TOTS3 UGPA3 USIM5 VALE3 VVAR3 YDUQ3 WEGE3 
EOF

cat <<'EOF' | tr ' ' '\n' > tmp_snp500_symbols
A AAL AAP AAPL ABBV ABC ABMD ABT ACN ADBE ADI ADM ADP ADSK AEE AEP AES AFL AIG
AIV AIZ AJG AKAM ALB ALGN ALK ALL ALLE ALXN AMAT AMCR AMD AME AMGN AMP AMT AMZN
ANET ANSS ANTM AON AOS APA APD APH APTV ARE ATO ATVI AVB AVGO AVY AWK AXP AZO
BA BAC BAX BBY BDX BEN BF.B BIIB BIO BK BKNG BKR BLK BLL BMY BR BRK.B BSX BWA
BXP C CAG CAH CARR CAT CB CBOE CBRE CCI CCL CDNS CDW CE CERN CF CFG CHD CHRW
CHTR CI CINF CL CLX CMA CMCSA CME CMG CMI CMS CNC CNP COF COG COO COP COST COTY
CPB CPRT CRM CSCO CSX CTAS CTL CTSH CTVA CTXS CVS CVX CXO D DAL DD DE DFS DG
DGX DHI DHR DIS DISCA DISCK DISH DLR DLTR DOV DOW DPZ DRE DRI DTE DUK DVA DVN
DXC DXCM EA EBAY ECL ED EFX EIX EL EMN EMR EOG EQIX EQR ES ESS ETFC ETN ETR
EVRG EW EXC EXPD EXPE EXR F FANG FAST FB FBHS FCX FDX FE FFIV FIS FISV FITB
FLIR FLS FLT FMC FOX FOXA FRC FRT FTI FTNT FTV GD GE GILD GIS GL GLW GM GOOG
GOOGL GPC GPN GPS GRMN GS GWW HAL HAS HBAN HBI HCA HD HES HFC HIG HII HLT HOLX
HON HPE HPQ HRB HRL HSIC HST HSY HUM HWM IBM ICE IDXX IEX IFF ILMN INCY INFO
INTC INTU IP IPG IPGP IQV IR IRM ISRG IT ITW IVZ J JBHT JCI JKHY JNJ JNPR JPM K
KEY KEYS KHC KIM KLAC KMB KMI KMX KO KR KSS KSU L LB LDOS LEG LEN LH LHX LIN
LKQ LLY LMT LNC LNT LOW LRCX LUV LVS LW LYB LYV MA MAA MAR MAS MCD MCHP MCK MCO
MDLZ MDT MET MGM MHK MKC MKTX MLM MMC MMM MNST MO MOS MPC MRK MRO MS MSCI MSFT
MSI MTB MTD MU MXIM MYL NBL NCLH NDAQ NEE NEM NFLX NI NKE NLOK NLSN NOC NOV NOW
NRG NSC NTAP NTRS NUE NVDA NVR NWL NWS NWSA O ODFL OKE OMC ORCL ORLY OTIS OXY
PAYC PAYX PBCT PCAR PEAK PEG PEP PFE PFG PG PGR PH PHM PKG PKI PLD PM PNC PNR
PNW PPG PPL PRGO PRU PSA PSX PVH PWR PXD PYPL QCOM QRVO RCL RE REG REGN RF RHI
RJF RL RMD ROK ROL ROP ROST RSG RTX SBAC SBUX SCHW SEE SHW SIVB SJM SLB SLG SNA
SNPS SO SPG SPGI SRE STE STT STX STZ SWK SWKS SYF SYK SYY T TAP TDG TDY TEL TFC
TFX TGT TIF TJX TMO TMUS TPR TROW TRV TSCO TSN TT TTWO TWTR TXN TXT TYL UA UAA
UAL UDR UHS ULTA UNH UNM UNP UPS URI USB V VAR VFC VIAC VLO VMC VNO VRSK VRSN
VRTX VTR VZ WAB WAT WBA WDC WEC WELL WFC WHR WLTW WM WMB WMT WRB WRK WST WU WY
WYNN XEL XLNX XOM XRAY XRX XYL YUM ZBH ZBRA ZION ZTS
EOF

rm -f script
date_from="2000-01-01"

cat <<EOF > tmp_mutf
FNILX Fidelity ZERO Large Cap Index Fund
FZROX Fidelity ZERO Total Market Index Fund
VTSMX Vanguard Total Stock Market Index Fund
VIGIX Vanguard Growth Index Fund Institutional Shares
FXAIX Fidelity 500 Index Fund
VOO Vanguard Index Funds S&P 500 ETF USD
VUG Vanguard Index FDS Vanguard Growth
EOF

cat <<EOF > tmp_idx
GSPC S&P 500
BVSP Bovespa
EOF

for name in $(cat tmp_mutf | grep -v "^#" | cut -f 1 -d' ' | paste -d' ' -s -); do
	echo "echo \"mutf:${name}\"; ./pull_symbol ${name} ${date_from} 2>/dev/null > data/m/${name}" >> script
done

for name in $(cat tmp_idx | grep -v "^#" | cut -f 1 -d' ' | paste -d' ' -s -); do
	echo "echo \"idx:^${name}\"; ./pull_symbol ^${name} ${date_from} 2>/dev/null > data/i/${name}" >> script
done

cat tmp_bvsp_symbols | awk '{ printf "echo \"bvsp:%s.SA\"; ./pull_symbol %s.SA '"${date_from}"' 2>/dev/null > data/s/%s.SA\n", $0, $0, $0 }' >> script
cat tmp_snp500_symbols | awk '{ printf "echo \"snp500:%s\"; ./pull_symbol %s '"${date_from}"' 2>/dev/null > data/s/%s\n", $0, $0, $0 }' >> script

name="BOVA11"
echo "echo \"mutf:^${name}\"; ./pull_symbol ${name}.SA ${date_from} 2>/dev/null > data/m/${name}.SA" >> script

cat <<'EOF' > plot
#!/usr/bin/env Rscript
require(quantmod)
args = commandArgs(trailingOnly=TRUE)
# args = c("-f=2000-01-01", "-r=2020-07-15", "i/BVSP", "i/GSPC")
# args <- c("-f:2000-01-01", "-r:2020-07-15", "-t:2020-07-15", "GGBR4", "KLBN11", "AZUL4")
prefix3 <- substr(args,1,3)
suffix4 <- substr(args,4,10000)
from_args <- which(prefix3 == "-f=" | prefix3 == "-f:")
to_args   <- which(prefix3 == "-t=" | prefix3 == "-t:")
ref_args  <- which(prefix3 == "-r=" | prefix3 == "-r:")
to   = Sys.Date()
from = to - 365
ref  = from
if (length(from_args) > 0) {
	from = try(as.Date(suffix4[max(from_args)]),silent=TRUE)
	stopifnot(class(from) != "try-error")
}
if (length(to_args) > 0) {
	to = try(as.Date(suffix4[max(to_args)]),silent=TRUE)
	stopifnot(class(to) != "try-error")
}
if (length(ref_args) > 0) {
	ref = try(as.Date(suffix4[max(ref_args)]),silent=TRUE)
	stopifnot(class(ref) != "try-error")
}

symbol_args <- 1:length(args)
symbol_args <- setdiff(symbol_args, c(from_args, to_args, ref_args))

date_start = as.character(from)
date_end   = as.character(to)
date_norm  = as.character(ref)
symbols = args[symbol_args]

# one year until today is the default

filenames=sprintf("data/%s", symbols)
print(filenames)

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

pdf("tmp.pdf",width=8,height=5.5,pointsize=12)
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
dev.off()

EOF
chmod +x plot







