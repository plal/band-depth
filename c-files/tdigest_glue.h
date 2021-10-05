#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#include <stdio.h>
#include "band-depth.h"

s32 t_digest_run(FILE *summary, Curve* *curves, s32 n, s32 size);

#ifdef __cplusplus
}
#endif
