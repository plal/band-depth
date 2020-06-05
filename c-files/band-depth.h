#pragma once

#include <inttypes.h>
#include <time.h>

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

typedef int8_t   s8 ;
typedef int16_t  s16;
typedef int32_t  s32;
typedef int64_t  s64;

typedef float    f32;
typedef double   f64;

typedef u8       b8;
typedef u16      b16;
typedef u32      b32;
typedef u64      b64;

#define ArrayCount(Array) (sizeof(Array) / sizeof((Array)[0]))
#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))

/* ************* DATA STRUCTURES ************* */

#define accepted_diff  0.000001
#define constant_S 6

//
// [ Curve ... values ... ]
//
typedef struct {
	s32 num_points;
	s32 num_bytes;
	s32 max_rank;
	s32 min_rank;
	f64 original_depth;
	f64 original_depth_time;
	f64 fast_depth;
	f64 fast_depth_time;
	f64 original_modified_depth;
	f64 original_modified_depth_time;
	f64 fast_modified_depth;
	f64 fast_modified_depth_time;
	f64 t_digest_depth;
	f64 t_digest_depth_time;
	f64 t_digest_modified_depth;
	f64 t_digest_modified_depth_time;
	f64 sliding_depth;
	f64 sliding_depth_time;
	f64* pointwise_depths;
	f64 values[];
} Curve;

struct tdigest_info {
	size_t  size;
	clock_t time;
};
