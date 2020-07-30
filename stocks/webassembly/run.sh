# https://mbebenita.github.io/WasmExplorer/
# https://surma.dev/things/c-to-webassembly/
export PATH=/usr/local/Cellar/llvm/10.0.0_3/bin:$PATH
cat <<EOF | sed 's/#.*$//g' | paste -d' ' -s - | tr ';' '\n' | sed 's/  */ /g' | sed 's/^ *//g' > script
clang
--target=wasm32
-nostdlib              # Don’t try and link against a standard library
-O3                    # Agressive optimizations
-flto                  # Add metadata for link-time optimizations
-Wl,--no-entry
-Wl,--export-all
-Wl,--lto-O3           # Aggressive link-time optimizations
# -Wl,-z,stack-size=$[8 * 1024 * 1024]      # Set maximum stack size to 8MiB
-o add.wasm
add.c
;
wasm2wat add.wasm > add.wat
EOF
cat script
bash script
# +  -O3 \ # Agressive optimizations
# +  -flto \ # Add metadata for link-time optimizations
#    -nostdlib \
#    -Wl,--no-entry \
#    -Wl,--export-all \
# +  -Wl,--lto-O3 \ # Aggressive link-time optimizations
