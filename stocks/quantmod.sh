

# symbol date_start
cat <<'EOF' > tmp_download_symbol.R
#!/usr/bin/env Rscript
require(quantmod)
args = commandArgs(trailingOnly=TRUE)
input_symbol = args[1]
input_from = as.Date(args[2])
x <- as.data.frame(quantmod::getSymbols(input_symbol, src ="yahoo", from=input_from, auto.assign=F))
x <- data.frame(symbol=input_symbol, date=rownames(x), x)
write.table(x,sep="|",quote=F,row.names=F)
EOF
chmod +x tmp_download_symbol.R

cat <<'EOF' > tmp_bvsp_symbols
ABEV3
AZUL4
BTOW3
B3SA3
BBAS3
BBSE3
BBDC3
BBDC4
BRAP4
BRML3
BRKM5
BRFS3
BPAC11
CRFB3
CCRO3
CVCB3
CMIG4
HGTX3
CIEL3
COGN3
CSAN3
CPFE3
CSNA3
CYRE3
ECOR3
ENBR3
ELET3
ELET6
EMBR3
EGIE3
EQTL3
GGBR4
GOLL4
PCAR4
FLRY3
HAPV3
HYPE3
IGTA3
GNDI3
IRBR3
ITUB4
ITSA4
JBSS3
KLBN11
RENT3
LAME4
LREN3
MGLU3
MRFG3
GOAU4
BEEF3
MRVE3
MULT3
NTCO3
PETR3
PETR4
QUAL3
RADL3
RAIL3
SBSP3
SANB11
SULA11
SUZB3
TAEE11
VIVT4
TIMP3
TOTS3
UGPA3
USIM5
VALE3
VVAR3
YDUQ3
WEGE3
EOF

rm -f script
date_from="2010-01-01"
cat tmp_bvsp_symbols | awk '{ printf "./tmp_download_symbol.R %s.SA '"${date_from}"' 2>/dev/null > data_%s\n", $0, $0 }' >> script

#
# ./tmp_download_symbol.R ^BVSP 2010-01-01 2>/dev/null | tee BVSP | less 
#
# AmBev	ABEV3	beverages	São Paulo
# Azul	AZUL4	airlines	Barueri
# B2W	BTOW3	online retail	Rio de Janeiro
# B3	B3SA3	stock exchange	São Paulo
# Banco do Brasil	BBAS3	banking	Brasília
# BB Seguridade	BBSE3	insurance	Brasília
# Bradesco	BBDC3	banking	Osasco
# Bradesco	BBDC4	banking	Osasco
# Bradespar	BRAP4	holding	São Paulo
# BRMalls	BRML3	real state	Rio de Janeiro
# Braskem	BRKM5	petrochemicals	São Paulo
# BRF	BRFS3	foods	Itajaí
# BTG Pactual	BPAC11	banking	São Paulo
# Carrefour Brasil	CRFB3	retail	São Paulo
# CCR	CCRO3	transportation	São Paulo
# CVC Brasil	CVCB3	travel and tourism	Santo André
# CEMIG	CMIG4	electricity utility	Belo Horizonte
# Cia. Hering	HGTX3	clothing	Blumenau
# Cielo	CIEL3	payment system	Barueri
# Cogna	COGN3	higher education	Belo Horizonte
# Cosan	CSAN3	conglomerate	São Paulo
# CPFL Energia	CPFE3	electric utility	Campinas
# CSN	CSNA3	siderurgy and metallurgy	Rio de Janeiro
# Cyrela Brazil Realty	CYRE3	real estate	São Paulo
# EcoRodovias	ECOR3	transportation	São Paulo
# EDP - Energias do Brasil	ENBR3	electricity utility	São Paulo
# Eletrobras	ELET3	electric utility	Rio de Janeiro
# Eletrobras	ELET6	electric utility	Rio de Janeiro
# Embraer	EMBR3	aerospace/defense	São José dos Campos
# ENGIE Brasil	EGIE3	electricity utility	Florianópolis
# Equatorial Energia	EQTL3	electricity utility	Brasília
# Gerdau	GGBR4	siderurgy and metallurgy	São Paulo
# Gol	GOLL4	airlines	São Paulo
# GPA	PCAR4	retail	São Paulo
# Grupo Fleury	FLRY3	healthcare	São Paulo
# Grupo Hapvida	HAPV3	healthcare	Fortaleza
# Hypera Pharma	HYPE3	pharmaceutical	São Paulo
# Iguatemi	IGTA3	shopping malls	São Paulo
# Intermédica	GNDI3	healthcare	São Paulo
# IRB Brasil RE	IRBR3	insurance	Rio de Janeiro
# Itaú Unibanco	ITUB4	banking	São Paulo
# Itaúsa	ITSA4	holding	São Paulo
# JBS	JBSS3	food and beverages	São Paulo
# Klabin	KLBN11	paper and pulp	São Paulo
# Localiza	RENT3	rental car	Belo Horizonte
# Lojas Americanas	LAME4	department store	Rio de Janeiro
# Lojas Renner	LREN3	department store	Porto Alegre
# Magazine Luiza	MGLU3	department store	São Paulo
# Marfrig	MRFG3	foods	São Paulo
# Metalúrgica Gerdau	GOAU4	holding	Porto Alegre
# Minerva Foods	BEEF3	foods	Barretos
# MRV	MRVE3	construction and real estate	Belo Horizonte
# Multiplan	MULT3	shopping malls	Rio de Janeiro
# Natura & Co	NTCO3	cosmetics	São Paulo
# Petrobras	PETR3	oil and gas	Rio de Janeiro
# Petrobras	PETR4	oil and gas	Rio de Janeiro
# Qualicorp	QUAL3	insurance	São Paulo
# RaiaDrogasil	RADL3	drugstore	São Paulo
# Rumo	RAIL3	logistics	Curitiba
# Sabesp	SBSP3	waste management	São Paulo
# Santander Brasil	SANB11	banking	São Paulo
# SulAmérica Seguros	SULA11	insurance	Rio de Janeiro
# Suzano Papel e Celulose	SUZB3	pulp and paper	Salvador
# Taesa S.A.	TAEE11	electricity utility	Rio de Janeiro
# Telefônica Vivo	VIVT4	telecommunications	São Paulo
# TIM Participações	TIMP3	telecommunications	Rio de Janeiro
# TOTVS	TOTS3	software	São Paulo
# Ultrapar	UGPA3	conglomerate	São Paulo
# Usiminas	USIM5	siderurgy and metallurgy	Belo Horizonte
# Vale	VALE3	mining	Rio de Janeiro
# Via Varejo	VVAR3	retail	São Caetano do Sul
# YDUQS	YDUQ3	higher education	Rio de Janeiro
# WEG	WEGE3	industrial engineering	Jaraguá do Sul


cat <<'EOF' > tmp_plot.R
#!/usr/bin/env Rscript
require(quantmod)
args = commandArgs(trailingOnly=TRUE)
# args <- c("2020-01-01", "2020-07-15", "2020-07-15", "GGBR4", "KLBN11", "AZUL4")
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
chmod +x tmp_plot.R







