#!/usr/bin/env python3
#
# generate renaming script
# find data | grep SA$ | tee a | ./tag.py
#
import sys

setor_to_acronimo = {
        "Bens Industriais" : "BI",
        "Comunicações" : "COM",
        "Consumo Cíclico" : "CC",
        "Consumo não Cíclico": "CNC",
        "Financeiro":"FIN",
        "Materiais Básicos":"MB",
        "Outros": "OUT",
        "Petróleo, Gás e Biocombustíveis": "PGB",
        "Saúde" : "SAU",
        "Tecnologia da Informação": "TI",
        "Utilidade Pública" : "UP"
}

c_setor,c_subsetor,c_segmento,c_nome,c_codigo,c_segmento2 = range(6)

prefix_to_acronimo = {}
with open('setores.psv') as f:
    line_no = 0
    for line in f:
        line_no = line_no + 1
        # discard header
        if line_no == 1:
            continue
        tokens = line.strip().split('|')
        acronimo = setor_to_acronimo.get(tokens[c_setor],None)
        if acronimo:
            print("%s -> %s" % (tokens[c_codigo], acronimo), file=sys.stderr)
            prefix_to_acronimo[tokens[c_codigo]] = acronimo

for line in sys.stdin:
    tokens = line.strip().split('/')
    symbol = tokens[-1]  
    index = -1
    for i in range(len(symbol)):
        if symbol[i] >= '0' and symbol[i] <= '9':
            index = i
            break
    if index == -1:
        continue
    # print(symbol)
    # print(index)
    symbol_prefix = symbol[:index]
    # print(symbol_prefix)
    a = prefix_to_acronimo.get(symbol_prefix,None)
    # print("%s -> %s" % (symbol_prefix, a))
    if a:
        aux = list(tokens)
        aux[-1] = "%s.%s" % (a, tokens[-1])
        print("mv %s %s" % (line.strip(), "/".join(aux)))









