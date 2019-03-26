#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <limits.h>
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

#define S 6
#define ArrayCount(Array) (sizeof(Array) / sizeof((Array)[0]))
#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))


//TODO
//Adjust curve structure to contain different types of band-original_band_depth
//Implement exact fast method
//	- Sort columns of M
//	- Build rank matrix R


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
	s32    num_points;
	s32    num_bytes;
	s32	   max_rank;
	s32	   min_rank;
	f64 original_depth;
	f64 fast_depth;
	f64 values[];
} Curve;

s32 curve_num_bytes(s32 num_points)
{
	return sizeof(Curve) + num_points * sizeof(f64);
}

Curve* curve_new(s32 num_points)
{
	s32 num_bytes = curve_num_bytes(num_points);
	Curve *result = malloc(num_bytes);
	result[0] = (Curve) {
		.num_points = num_points,
		.num_bytes  = num_bytes,
		.max_rank 	= 0,
		.min_rank	= 0
	};
	for (s32 i=0;i<num_points;++i) {
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

Curve* curve_new_constant(s32 num_points, f64 value) {
	Curve *curve = curve_new(num_points);
	for (s32 i=0;i<num_points;++i) {
		curve->values[i] = value;
	}
	return curve;
}

Curve* curve_new_curve_from_array(s32 num_points, f64 *values) {
	Curve *curve = curve_new(num_points);
	for (s32 i=0;i<num_points;++i) {
		curve->values[i] = values[i];
	}
	return curve;
}

Curve* curve_generate(s32 num_points) {
	Curve *curve = curve_new(num_points);
	f64 c     = get_number_with_prob(0.4, 0,  1);
	f64 sigma = get_number_with_prob(0.5, 1, -1);

	for(s32 i=0;i<num_points;i++) {
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
	s32 size = curve1->num_points;
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

void test_curve(Curve *curve, Curve* *curves, s32 num_curves) {
	for(s32 i=0; i<num_curves-1; ++i) {
		for(s32 j=i+1; j<num_curves; ++j) {
			s32 aux = is_curve_between(curve, curves[i], curves[j]);
			if(aux == 1) {
				printf("curve is between curve[%d] and curve[%d]\n", i, j);
			}
		}
	}
}

void print_curve(Curve *curve) {
	s32 size = curve->num_points;
	for(s32 i=0; i < size; i++) {
		printf("curve[%d]:%f\n",i,curve->values[i]);
	}
}

void original_band_depth(Curve* *curves, s32 n) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->original_depth = 0;
	}
	for(s32 i=0; i<n-1; ++i) {
		for(s32 j=i+1; j<n; ++j) {
			for(s32 k=0; k<n; ++k) {
				curves[k]->original_depth += is_curve_between(curves[k], curves[i], curves[j]);
			}
		}
	}
	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		curves[i]->original_depth /= n_choose_2;
	};

}

void fast_band_depth(Curve* *curves, s32 n) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->fast_depth = 0;
	}
	f64 n_choose_2 = n*(n-1.0)/2.0;
	for(s32 i=0; i<n; ++i) {
		s32 n_a = n-curves[i]->max_rank;
		s32 n_b = curves[i]->min_rank-1;
		curves[i]->fast_depth = (n_a*n_b+n-1)/n_choose_2;
	}

}


void rank_matrix_build(Curve* *curves, s32 n) {
	s32 size = curves[0]->num_points;
	f64 values_matrix[size][n][2];
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			values_matrix[i][j][0] = curves[j]->values[i];
			values_matrix[i][j][1] = j;
		}
	}
	/**/
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("[%f, %d] ", values_matrix[i][j][0], (int)values_matrix[i][j][1]);
		}
		printf("\n");
	}
	printf("\n");
	/**/
	f64 a[] = {0,0};
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			for (s32 k=(j+1); k<n; ++k) {
				if (values_matrix[i][j][0] > values_matrix[i][k][0]) {
					a[0] = values_matrix[i][j][0];
					a[1] = values_matrix[i][j][1];

					values_matrix[i][j][0] = values_matrix[i][k][0];
					values_matrix[i][j][1] = values_matrix[i][k][1];

					values_matrix[i][k][0] = a[0];
					values_matrix[i][k][1] = a[1];
				}
			}
		}
	}
	/**/
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("[%f, %d] ", values_matrix[i][j][0], (int)values_matrix[i][j][1]);
		}
		printf("\n");
	}
	printf("\n");
	/**/
	s32 rank_matrix[size][n];
	for(s32 i=0; i<n; ++i) {
		for(s32 j=0; j<size; ++j) {
			for(s32 k=0; k<n; ++k) {
				if(values_matrix[j][k][1] == i) {
					rank_matrix[j][i] = k+1;
				}
			}
		}
	}
	printf("\n");
	/**/
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("%d  ", rank_matrix[i][j]);
		}
		printf("\n");
	}
	/**/
	for (s32 i=0; i<n; ++i) {
		s32 max = 0;
		s32 min = INT_MAX;
		for(s32 j=0; j<size; ++j) {
			if(rank_matrix[j][i] > max) {
				max = rank_matrix[j][i];
			}
			if(rank_matrix[j][i] < min) {
				min = rank_matrix[j][i];
			}
		}
		curves[i]->max_rank = max;
		curves[i]->min_rank = min;
		/**/
		printf("curve[%d] max: %d\n", i, curves[i]->max_rank);
		printf("curve[%d] min: %d\n", i, curves[i]->min_rank);
		/**/
	}
/*
	for(s32 i=0; i<n; ++i) {
		for(s32 j=0; j<size; ++j) {
			curves[i]->rankings[j] = rank_matrix[j][i];
		}
	}
*/
}

//static inline u64;
//get_cpu_clock() { return __rdtsc(); }

int main() {
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
	s32 test = 0;
/*TESTING CONSTANT CURVES*/
	if(test == 1) {
		Curve *curves[] = {
			curve_new_constant(4,3),
			curve_new_constant(4,2),
			curve_new_constant(4,5),
			curve_new_constant(4,1),
			curve_new_constant(4,9)
		};

		s32 n = ArrayCount(curves);
		// for(s32 i = 0; i < num_curves; i++) {
		// 	curves[i] = curve_generate(curve_size);
		// }
		//u64 t = get_cpu_clock();
		original_band_depth(curves,n);
		//t = get_cpu_clock() - t;
		rank_matrix_build(curves, n);
		fast_band_depth(curves, n);
		for (s32 i=0;i<n;++i) {
			printf("original depth of curve %d is %.2f\n", i, curves[i]->original_depth);
		}

		for (s32 i=0;i<n;++i) {
			printf("fast depth of curve %d is %.2f\n", i, curves[i]->fast_depth);
		}

/*
		for(s32 i=0; i<curves[0]->num_points; ++i) {
			printf("%d ", curves[0]->rankings[i]);
		}
*/
		for(s32 i = 0; i < n; i++) {
			curve_free(curves[i]);
		}

	} else if (test == 0) {
/*TESTING RANDOM CURVES*/
		Curve *curves_random[] = {
			curve_generate(4),
			curve_generate(4),
			curve_generate(4),
			curve_generate(4),
			curve_generate(4),
		};

		s32 n_random = ArrayCount(curves_random);

		original_band_depth(curves_random,n_random);
		rank_matrix_build(curves_random, n_random);
		fast_band_depth(curves_random, n_random);

		for (s32 i=0;i<n_random;++i) {
			printf("original depth of curve %d is %.2f\n", i, curves_random[i]->original_depth);
		}

		for (s32 i=0;i<n_random;++i) {
			printf("fast depth of curve %d is %.2f\n", i, curves_random[i]->fast_depth);
		}


		for(s32 i = 0; i < n_random; i++) {
			curve_free(curves_random[i]);
		}

	} else {
		s32 n_p = 4;
		f64 y0[] = {0,-5,-4,-3};
		f64 y1[] = {6, 1, 8, 9};
		f64 y2[] = {6, 7, 8, 9};
		f64 y3[] = {0, 1, 2, 3};
		f64 y4[] = {6, 7, 2, 9};

		Curve *curve0 = curve_new_curve_from_array(n_p, y0);
		Curve *curve1 = curve_new_curve_from_array(n_p, y1);
		Curve *curve2 = curve_new_curve_from_array(n_p, y2);
		Curve *curve3 = curve_new_curve_from_array(n_p, y3);
		Curve *curve4 = curve_new_curve_from_array(n_p, y4);

		Curve *curves[] = {
			curve0,
			curve1,
			curve2,
			curve3,
			curve4
		};

		s32 n = ArrayCount(curves);

		original_band_depth(curves,n);
		rank_matrix_build(curves, n);
		fast_band_depth(curves, n);

		for (s32 i=0;i<n;++i) {
			printf("original depth of curve %d is %.2f\n", i, curves[i]->original_depth);
		}

		for (s32 i=0;i<n;++i) {
			printf("fast depth of curve %d is %.2f\n", i, curves[i]->fast_depth);
		}

		//test_curve(curves[2], curves, n);
	}
	//printf("clock cycles %"PRIu64"\n", t);

	// print_curve(curves[1]);
	// print_curve(curves[2]);
	// print_curve(curves[0]);

	//is_curve_between(line_1, line_2, line_3);

}
