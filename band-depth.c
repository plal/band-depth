#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <inttypes.h>

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

#define get_name(var)  #var
#define S 6
#define num_curves 3;
#define curve_size 4;

#define ArrayCount(Array) (sizeof(Array) / sizeof((Array)[0]))
#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))


//
//
//
f64 get_number_with_prob(f64 prob, f64 val1, f64 val2) {
	f64 random_number = (f64)rand() / (f64)RAND_MAX;
	if(random_number < prob) {
		return val1;
	} else {
		return val2;
	}
}

//
// [ Curve ... values ... ]
//
typedef struct {
	s32    num_pos32s; // num pos32s
	s32    num_bytes;
	f64 depth;
	f64 values[];
} Curve;

s32 curve_num_bytes(s32 num_pos32s)
{
	return sizeof(Curve) + num_pos32s * sizeof(f64);
}

Curve* curve_new(s32 num_pos32s)
{
	s32 num_bytes = curve_num_bytes(num_pos32s);
	Curve *result = malloc(num_bytes);
	result[0] = (Curve) {
		.num_pos32s = num_pos32s,
		.num_bytes  = num_bytes,
	};
	for (s32 i=0;i<num_pos32s;++i) {
		result->values[i] = 0.0;
	}
	return result;
}

Curve* curve_copy(Curve *original)
{
	char *raw_block = malloc(original->num_bytes);
	memcpy(raw_block, original, original->num_bytes);
	return (Curve*) raw_block;
}

void curve_free(Curve *curve)
{
	free(curve);
}

Curve* curve_new_constant(s32 num_pos32s, f64 value) {
	Curve *curve = curve_new(num_pos32s);
	for (s32 i=0;i<num_pos32s;++i) {
		curve->values[i] = value;
	}
	return curve;
}

Curve* curve_generate(s32 num_pos32s) {
	Curve *curve = curve_new(num_pos32s);
	f64 c     = get_number_with_prob(0.4, 0,  1);
	f64 sigma = get_number_with_prob(0.5, 1, -1);

	for(s32 i=0;i<num_pos32s;i++) {
		f64 t = (f64)rand() / (f64)RAND_MAX;
		if(t >= 0.3) {
			curve->values[i] = (i + (c*sigma*S));
		} else {
			curve->values[i] = i;
		}
	}
	return curve;
}

s32 is_curve_between(Curve *curve1, Curve *curve2, Curve *curve3) {
	s32 size = curve1->num_pos32s;
	for(s32 i=0;i<size;++i) {
		f64 a = curve1->values[i];
		f64 b = Min(curve2->values[i],curve3->values[i]);
		f64 c = Max(curve2->values[i],curve3->values[i]);
		if (a < b || a > c) {
			return 0;
		}
	}
	return 1;
}

void prs32_curve(Curve *curve) {
	s32 size = curve->num_pos32s;
	for(s32 i=0; i < size; i++) {
		printf("curve[%d]:%f\n",i,curve->values[i]);
	}
}

void original_band_depth(Curve* *curves, s32 n) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->depth = 0;
	}
	for(s32 i=0; i<n-1; ++i) {
		for(s32 j=i+1; j<n; ++j) {
			for(s32 k=0; k<n; ++k) {
				curves[k]->depth += is_curve_between(curves[k], curves[i], curves[j]);
			}
		}
	}
	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		curves[i]->depth /= n_choose_2;
	};

}

static inline u64
get_cpu_clock() { return __rdtsc(); }

s32 main() {
	srand ( time(NULL) );

	// Curve *line_1 = curve_generate(size);
	// Curve *line_2 = curve_generate(size);
	// Curve *line_3 = curve_generate(size);

	// printf("%p %p %p\n", line_1, line_2, line_3);
	//
	// for (s32 i = 0; i < size; i++ ) {
	//     printf( "line1[%d] : %f\n", i, line_1->values[i]);
	//     printf( "line2[%d] : %f\n", i, line_2->values[i]);
	//     printf( "line3[%d] : %f\n", i, line_3->values[i]);
	// }
	Curve *curves[] = {
		curve_new_constant(4,1),
		curve_new_constant(4,2),
		curve_new_constant(4,5),
		curve_new_constant(4,7),
		curve_new_constant(4,9)
	};

	s32 n = ArrayCount(curves);
	// for(s32 i = 0; i < num_curves; i++) {
	// 	curves[i] = curve_generate(curve_size);
	// }
	u64 t = get_cpu_clock();
	original_band_depth(curves,n);
	t = get_cpu_clock() - t;

	for (s32 i=0;i<n;++i) {
		printf("depth of curve %d is %.2f\n", i, curves[i]->depth);
	}
	printf("clock cycles %"PRIu64"\n", t);

	// prs32_curve(curves[0]);
	// prs32_curve(curves[1]);
	// prs32_curve(curves[2]);

	//is_curve_between(line_1, line_2, line_3);

	for(s32 i = 0; i < n; i++) {
		curve_free(curves[i]);
	}

//======================================================
    // srand(time(NULL));
    // s32 i;
    // f64 random_value, random_value1;
    // for(i=0; i < 5; i++) {
    //     random_value = get_number_with_prob(0.1, 1, 0);
    //     random_value1 = get_number_with_prob(0.5, 1, -1);
    //     printf ( "%f %f\n", random_value, random_value1);
    // }
//======================================================
//
//
//


//     /*LINE 1*/
//     struct pos32 pos3211;
//     pos3211.x = 1;
//     pos3211.y = 2;
//     struct pos32 pos3212;
//     pos3212.x = 2;
//     pos3212.y = 0;
//     struct pos32 pos3213;
//     pos3213.x = 3;
//     pos3213.y = 2;
//     pos32 line1[] = {pos3211, pos3212, pos3213};
//     /*LINE 2*/
//     struct pos32 pos3221;
//     pos3221.x = 1;
//     pos3221.y = 1;
//     struct pos32 pos3222;
//     pos3222.x = 2;
//     pos3222.y = 1;
//     struct pos32 pos3223;
//     pos3223.x = 3;
//     pos3223.y = 1;
//     pos32 line2[] = {pos3221, pos3222, pos3223};
//     /*LINE 3*/
//     struct pos32 pos3231;
//     pos3231.x = 1;
//     pos3231.y = 0;
//     struct pos32 pos3232;
//     pos3232.x = 2;
//     pos3232.y = 2;
//     struct pos32 pos3233;
//     pos3233.x = 3;
//     pos3233.y = 0;
//     pos32 line3[] = {pos3231, pos3232, pos3233};
//     s32 a = is_line_between(line2, line1, line3);
//     printf("%d\n", a);
}








#if 0


s32 is_line_between(pos32 line[], pos32 line1[], pos32 line2[]) {
    s32 i, is_between = 1;
    for(i = 0; i < SIZE; i++) {
        printf("line[%d]:%f line1[%d]:%f line[%d]:%f\n", i, line[i].y, i, line1[i].y, i, line2[i].y);
        if (!((line[i].y <= line1[i].y && line[i].y >= line2[i].y) ||
            (line[i].y <= line2[i].y && line[i].y >= line1[i].y))) {
                is_between = 0;
            }
    }
    return is_between;
}


#endif
