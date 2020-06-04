#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <limits.h>
#include <inttypes.h>

#include <iostream>
#include <cstdlib>
#include <algorithm>
#include "libs/TDigest.h"

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

#define accepted_diff  0.000001
#define S 6
#define ArrayCount(Array) (sizeof(Array) / sizeof((Array)[0]))
#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))


f64 get_number_with_prob(f64 prob, f64 val1, f64 val2) {
	f64 random_number = (f64)rand() / (f64)RAND_MAX;
	if(random_number < prob) {
		return val1;
	} else {
		return val2;
	}
}


/* ************* DATA STRUCTURES ************* */

//
// [ Curve ... values ... ]
//
typedef struct {
	s32 num_points;
	s32 num_bytes;
	s32	max_rank;
	s32	min_rank;
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

/* ************* CURVE BASICS ************* */

s32 curve_num_bytes(s32 num_points)
{
	return sizeof(Curve) + num_points * sizeof(f64);
}

Curve* curve_new(s32 num_points)
{
	s32 num_bytes = curve_num_bytes(num_points);
	Curve *result = (Curve*)malloc(num_bytes);
	result[0] = (Curve) {
		.num_points = num_points,
		.num_bytes  = num_bytes,
		.max_rank 	= 0,
		.min_rank	= INT_MAX
	};
	result->pointwise_depths = (f64*) malloc(num_points * sizeof(f64));
	for (s32 i=0;i<num_points;++i) {
		result->values[i] = 0.0;
		result->pointwise_depths[i] = 0.0;
	}
	return result;
}

Curve* curve_copy(Curve *original)
{
  char *raw_block = (char*)malloc(original->num_bytes);
	memcpy(raw_block, original, original->num_bytes);
	return (Curve*) raw_block;
}

void curve_free(Curve *curve)
{
	free(curve);
}

/* ************* CURVE GENERATION ************* */

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

/* ************* CURVE I/O ************* */

void curve_print(Curve *curve) {
	s32 size = curve->num_points;
	for(s32 i=0; i < size; i++) {
		printf("curve[%d]:%f\n",i,curve->values[i]);
	}
}

void curve_print_all_curves(Curve* *curves, s32 num_curves) {
	s32 num_points = curves[0]->num_points;
	for(s32 i=0; i<num_curves; ++i) {
		printf("Curve %d -> ", i);
		for(s32 j=0; j<num_points; ++j) {
			printf("[%d]:%.1f ", j,curves[i]->values[j]);
		}
		printf("\n");
	}
	printf("\n");
}

void curve_write_to_file(FILE *f, Curve *curve) {

	fprintf(f,"%f,",curve->original_depth);
	fprintf(f,"%f,",curve->original_depth_time);

	fprintf(f,"%f,",curve->fast_depth);
	fprintf(f,"%f,",curve->fast_depth_time);

	fprintf(f,"%f,",curve->t_digest_depth);
	fprintf(f,"%f,",curve->t_digest_depth_time);

	fprintf(f,"%f,",curve->original_modified_depth);
	fprintf(f,"%f,",curve->original_modified_depth_time);

	fprintf(f,"%f,",curve->fast_modified_depth);
	fprintf(f,"%f,",curve->fast_modified_depth_time);

	fprintf(f,"%f,",curve->t_digest_modified_depth);
	fprintf(f,"%f,",curve->t_digest_modified_depth_time);

	fprintf(f,"%f,",curve->sliding_depth);
	fprintf(f,"%f\n",curve->sliding_depth_time);

}

/* ************* CURVE HELPER FUNCTIONS ************* */

s32 curve_is_between(Curve *curve1, Curve *curve2, Curve *curve3) {
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

void curve_test(Curve *curve, Curve* *curves, s32 num_curves) {
	for(s32 i=0; i<num_curves-1; ++i) {
		for(s32 j=i+1; j<num_curves; ++j) {
			s32 aux = curve_is_between(curve, curves[i], curves[j]);
			if(aux == 1) {
				printf("curve is between curve[%d] and curve[%d]\n", i, j);
			}
		}
	}
}

s32 curve_count_points_between(Curve *curve1, Curve *curve2, Curve *curve3) {
	s32 size = curve1->num_points;
	s32 count = 0;
	for(s32 i=0;i<size;++i) {
		f64 a = curve1->values[i];
		f64 b = Min(curve2->values[i],curve3->values[i]);
		f64 c = Max(curve2->values[i],curve3->values[i]);
		if (b <= a && a <= c) {
			count += 1;
		}
	}
	return count;
}

/* ************* NAIVE DEPTH ALGORITHMS ************* */

void original_band_depth(Curve* *curves, s32 n) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->original_depth = 0;
		curves[i]->original_depth_time = 0;
	}

	for (s32 k=0; k<n; ++k) {
		clock_t t = clock();
		for(s32 i=0; i<n-1; ++i) {
			for(s32 j=i+1; j<n; ++j) {
					curves[k]->original_depth += curve_is_between(curves[k], curves[i], curves[j]);
				}
		}
		t = clock() - t;
		curves[k]->original_depth_time += ((double)t)/CLOCKS_PER_SEC;
	};

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		curves[i]->original_depth /= n_choose_2;
		t = clock() -t;
		curves[i]->original_depth_time += ((double)t)/CLOCKS_PER_SEC;
	};

}

void original_modified_band_depth(Curve* *curves, s32 n) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->original_modified_depth = 0;
		curves[i]->original_modified_depth_time = 0;
	}

	f64 size = curves[0]->num_points;
	for(s32 k=0; k<n; ++k) {
		clock_t t = clock();
		for(s32 i=0; i<n-1; ++i) {
			for(s32 j=i+1; j<n; ++j) {
				f64 proportion = curve_count_points_between(curves[k], curves[i], curves[j])/size;
				curves[k]->original_modified_depth += proportion;
			}
		}
		t = clock() - t;
		curves[k]->original_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		curves[i]->original_modified_depth /= n_choose_2;
		t = clock() -t;
		curves[i]->original_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	};

}

/* ************* RANK MATRIX HELPER FUNCTIONS ************* */

void rank_matrix_build(Curve* *curves, s32 n, s32 size, s32 **rank_matrix) {
	//printf("entered build rank matrix function\n");
	//printf("allocating space for values matrix\n");
	//f64 values_matrix[size][n][2];
	s32 tuple_size = 2;
	f64*** values_matrix = (f64***)malloc(size * sizeof(f64**));
	if (values_matrix == NULL) {
		fprintf(stderr, "Out of memory\n");
		exit(0);
	}
	for (int i=0; i<size; ++i) {
		values_matrix[i] = (f64**)malloc(n * sizeof(f64*));
		if (values_matrix[i] == NULL) {
			fprintf(stderr, "Out of memory\n");
			exit(0);
		}
		for (int j=0; j<n; ++j) {
			values_matrix[i][j] = (f64*)malloc(tuple_size * sizeof(f64*));
			if (values_matrix[i][j] == NULL) {
				fprintf(stderr, "Out of memory\n");
				exit(0);
			}
		}
	}
	//printf("building values matrix\n");
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			values_matrix[i][j][0] = curves[j]->values[i];
			values_matrix[i][j][1] = j;
		}
	}
	/**
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("[%f, %d] ", values_matrix[i][j][0], (int)values_matrix[i][j][1]);
		}
		printf("\n");
	}
	printf("\n");
	/**/
	/*SORTING ROWS OF VALUE MATRIX*/
	//printf("sorting rows of value matrix\n");
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
	/**
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("[%f, %d] ", values_matrix[i][j][0], (int)values_matrix[i][j][1]);
		}
		printf("\n");
	}
	printf("\n");
	/**/
	/*BUILDING RANK MATRIX*/
	//s32 rank_matrix[size][n];
	//printf("building rank matrix\n");
	for(s32 i=0; i<n; ++i) {
		for(s32 j=0; j<size; ++j) {
			for(s32 k=0; k<n; ++k) {
				if(values_matrix[j][k][1] == i) {
					rank_matrix[j][i] = k+1;
				}
			}
		}
	}
	/**
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("%d  ", rank_matrix[i][j]);
		}
		printf("\n");
	}
	printf("\n");
	/**/
	//printf("rank matrix built\n");
	free(values_matrix);
}

void rank_matrix_find_min_max(Curve* *curves, s32 n, s32 size, s32 **rank_matrix) {
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
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
		t = clock() - t;
		curves[i]->fast_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}
}

void rank_matrix_find_proportion( Curve* *curves, s32 n, s32 size, s32 **rank_matrix, f64* proportion) {

	s32 **match = (s32**)malloc(size * sizeof(s32*));
	for (int i=0; i<size; ++i) {
		match[i] = (s32*)malloc(n * sizeof(s32));
	}

	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		for (s32 j=0; j<size; ++j) {
			s32 n_a = n-rank_matrix[j][i];
			s32 n_b = rank_matrix[j][i]-1;
			match[j][i] = n_a*n_b;
		}
		t = clock() - t;
		curves[i]->fast_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}

	for(s32 i=0; i<n; ++i) {
		clock_t t = clock();
		f64 sum = 0.0;
		for(s32 j=0; j<size; ++j) {
			sum += match[j][i];
		}
		proportion[i] = sum/size;
		t = clock() - t;
		curves[i]->fast_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}
}

/* ************* RANK MATRIX BASED (FAST) DEPTH ALGORITHMS ************* */

void fast_band_depth(Curve* *curves, s32 n, s32 size, s32 **rank_matrix) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->fast_depth = 0;
		curves[i]->fast_depth_time = 0;
	}
	rank_matrix_find_min_max(curves, n, size, rank_matrix);

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for(s32 i=0; i<n; ++i) {
		clock_t t = clock();
		s32 n_a = n-curves[i]->max_rank;
		s32 n_b = curves[i]->min_rank-1;
		curves[i]->fast_depth = (n_a*n_b+n-1)/n_choose_2;
		t = clock() - t;
		curves[i]->fast_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}

}

void fast_modified_band_depth(Curve* *curves, s32 n, s32 size, s32 **rank_matrix) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->fast_modified_depth = 0;
		curves[i]->fast_modified_depth_time = 0;
	}

	f64 proportion[n];
	for(s32 i=0; i<n; ++i) { proportion[i] = 0.0; }
	rank_matrix_find_proportion(curves, n, size, rank_matrix, proportion);

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		curves[i]->fast_modified_depth = (proportion[i]+n-1)/n_choose_2;
		t = clock() - t;
		curves[i]->fast_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	};

}

/* ************* T-DIGEST HELPER FUNCTIONS ************* */

std::vector<PDigest*> t_digest_build(Curve* *curves, s32 n, s32 size) {

	std::vector<PDigest*> tdigests;

	for (s32 j=0; j<size; ++j) {

		PDigest* t = new PDigest();
		std::vector<float> values;
		std::vector<float> weights;

		for (s32 i=0; i<n; ++i) {
			values.push_back(curves[i]->values[j]);
			weights.push_back(1);
		}

		t->add(values, weights);

		tdigests.push_back(t);

	}

	return tdigests;

}

void t_digest_find_min_max(Curve* *curves, s32 n, s32 size, std::vector<PDigest*> tdigests) {
	for(s32 j=0; j<size; ++j) {
		for (s32 i=0; i<n; ++i) {
			clock_t t_ = clock();
			s32 rank = int(tdigests[j]->inverse_quantile(curves[i]->values[j])*n)+1;
			if (rank > curves[i]->max_rank) { curves[i]->max_rank = rank; }
			if (rank < curves[i]->min_rank) { curves[i]->min_rank = rank; }
			t_ = clock() - t_;
			curves[i]->t_digest_depth_time += ((double)t_)/CLOCKS_PER_SEC;
		}

	}
}

void t_digest_find_proportion(Curve* *curves, s32 n, s32 size, std::vector<PDigest*> tdigests, f64* proportion) {
	s32 **match = (s32**)malloc(size * sizeof(s32*));
	for (int i=0; i<size; ++i) {
		match[i] = (s32*)malloc(n * sizeof(s32));
	}

	for (s32 j=0; j<size; ++j) {

		for (s32 i=0; i<n; ++i) {
			clock_t t_ = clock();
			s32 rank = int(tdigests[j]->inverse_quantile(curves[i]->values[j])*n)+1;
			s32 n_a = n-rank;
			s32 n_b = rank-1;
			match[j][i] = n_a*n_b;
			t_ = clock() - t_;
			curves[i]->t_digest_modified_depth_time += ((double)t_)/CLOCKS_PER_SEC;
		}

	}

	for(s32 i=0; i<n; ++i) {
		clock_t t = clock();
		f64 sum = 0.0;
		for(s32 j=0; j<size; ++j) {
			sum += match[j][i];
		}
		proportion[i] = sum/size;
		t = clock() - t;
		curves[i]->t_digest_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;
	}
}

/* ************* T-DIGEST BASED DEPTH ALGORITHMS ************* */

void t_digest_band_depth(Curve* *curves, s32 n, s32 size, std::vector<PDigest*> tdigests) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->t_digest_depth = 0;
	}

	t_digest_find_min_max(curves, n, size, tdigests);

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for(s32 i=0; i<n; ++i) {
		clock_t t = clock();
		s32 n_a = n-curves[i]->max_rank;
		s32 n_b = curves[i]->min_rank-1;
		curves[i]->t_digest_depth = (n_a*n_b+n-1)/n_choose_2;
		t = clock() - t;
		curves[i]->t_digest_depth_time += ((double)t)/CLOCKS_PER_SEC;

	}

}

void t_digest_modified_band_depth(Curve* *curves, s32 n, s32 size, std::vector<PDigest*> tdigests) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->t_digest_modified_depth = 0;
	}

	f64 proportion[n];
	for(s32 i=0; i<n; ++i) { proportion[i] = 0.0; }
	t_digest_find_proportion(curves, n, size, tdigests, proportion);

	f64 n_choose_2 = n*(n-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		curves[i]->t_digest_modified_depth = (proportion[i]+n-1)/n_choose_2;
		t = clock() - t;
		curves[i]->t_digest_modified_depth_time += ((double)t)/CLOCKS_PER_SEC;

	};

}

/* ************* SLIDING WINDOW DEPTH ALGORITHM ************* */

void sliding_window_original_depth(Curve* *curves, s32 n, s32 window_size) {
	for (s32 i=0; i<n; ++i) {
		curves[i]->sliding_depth = 0;
		curves[i]->sliding_depth_time = 0;
	}

	s32 pad  = window_size/2;
	f64 size = curves[0]->num_points;

	for (s32 k=0; k<n; ++k) {
		if (k < pad){
			clock_t t = clock();
			for(s32 i=0; i<window_size-1; ++i) {
				for(s32 j=i+1; j<window_size; ++j) {
					f64 proportion = curve_count_points_between(curves[k], curves[i], curves[j])/size;
					curves[k]->sliding_depth += proportion;
				}
			}
			t = clock() - t;
			curves[k]->sliding_depth_time += ((double)t)/CLOCKS_PER_SEC;
		} else if (k >= (n-pad)) {
			clock_t t = clock();
			for(s32 i=(n-window_size); i<n-1; ++i) {
				for(s32 j=i+1; j<n; ++j) {
					f64 proportion = curve_count_points_between(curves[k], curves[i], curves[j])/size;
					curves[k]->sliding_depth += proportion;
				}
			}
			t = clock() - t;
			curves[k]->sliding_depth_time += ((double)t)/CLOCKS_PER_SEC;
		} else {
			clock_t t = clock();
			for(s32 i=(k-pad); i<(k+pad)-1; ++i) {
				for(s32 j=i+1; j<(k+pad); ++j) {
					f64 proportion = curve_count_points_between(curves[k], curves[i], curves[j])/size;
					curves[k]->sliding_depth += proportion;
				}
			}
			t = clock() - t;
			curves[k]->sliding_depth_time += ((double)t)/CLOCKS_PER_SEC;
		}
	};

	f64 win_choose_2 = window_size*(window_size-1.0)/2.0;
	for (s32 i=0; i<n; ++i) {
		clock_t t = clock();
		curves[i]->sliding_depth /= win_choose_2;
		t = clock() -t;
		curves[i]->sliding_depth_time += ((double)t)/CLOCKS_PER_SEC;
	};
}

/* ************* EXTREMAL DEPTH HELPER FUNCTINOS ************* */

void pointwise_depth(Curve *curve, Curve* *curves, s32 n) {
	f64 size = curves[0]->num_points;

	for(s32 i=0; i<size; ++i) {
		s32 count = 0;

		for (s32 j=0; j<n; ++j) {
			count += ((curves[n]->values[i] < curve->values[i]) - (curves[n]->values[i] > curve->values[i]));
		}

		curve->pointwise_depths[i] = 1 - (abs(count)/n);
		printf("%f\n", curve->pointwise_depths[i]);
	};
}

//TODO: refactor this \/ method

void band_depths_run_and_summarize(Curve* *curves, s32 n, s32 size, s32 **rank_matrix, FILE *output, FILE *summary) {
	fprintf(summary,"num_curves,num_points,");
	fprintf(summary,"od_time,omd_time,");
	fprintf(summary,"rm_build_time,rm_size,");
	fprintf(summary,"fd_time,fmd_time,");
	fprintf(summary,"td_build_time,td_size,");
	fprintf(summary,"td_time,tmd_time,");
	fprintf(summary,"sd_time\n");

	fprintf(summary,"%d,",n);
	fprintf(summary,"%d,",size);

	//printf("calculating original band depth...\n");
	clock_t t_original_depth = clock();
	original_band_depth(curves, n);
	t_original_depth = clock() - t_original_depth;
	double time_taken_od = ((double)t_original_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_od);

	//printf("calculating original modified band depth...\n");
	clock_t t_original_modified_depth = clock();
	original_modified_band_depth(curves,n);
	t_original_modified_depth = clock() - t_original_modified_depth;
	double time_taken_omd = ((double)t_original_modified_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_omd);

	//printf("building rank matrix...\n");
	clock_t t_rank_matrix_build = clock();
	rank_matrix_build(curves, n, size, rank_matrix);
	t_rank_matrix_build = clock() - t_rank_matrix_build;
	double time_taken_rmb = ((double)t_rank_matrix_build)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_rmb);

	s64 size_matrix = n * size * sizeof(s32);
	fprintf(summary,"%ld,", size_matrix);

	//printf("calculating fast band depth...\n");
	clock_t t_fast_depth = clock();
	fast_band_depth(curves, n, size, rank_matrix);
	t_fast_depth = clock() - t_fast_depth;
	double time_taken_fd = ((double)t_fast_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_fd);

	//printf("calculating fast modified band depth...\n");
	clock_t t_fast_modified_depth = clock();
	fast_modified_band_depth(curves, n, size, rank_matrix);
	t_fast_modified_depth = clock() - t_fast_modified_depth;
	double time_taken_fmd = ((double)t_fast_modified_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_fmd);

	clock_t t_tdigests_build = clock();
	std::vector<PDigest*> tdigests = t_digest_build(curves, n, size);
	t_tdigests_build = clock() - t_tdigests_build;
	double time_taken_tdb = ((double)t_tdigests_build)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_tdb);

	s64 size_tdigests = sizeof(*tdigests[0]) * tdigests.size();
	fprintf(summary,"%ld,", size_tdigests);

	clock_t t_tdigest_depth = clock();
	t_digest_band_depth(curves, n, size, tdigests);
	t_tdigest_depth = clock() - t_tdigest_depth;
	double time_taken_td = ((double)t_tdigest_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_td);

	clock_t t_tdigest_modified_depth = clock();
	t_digest_modified_band_depth(curves, n, size, tdigests);
	t_tdigest_modified_depth = clock() - t_tdigest_modified_depth;
	double time_taken_tmd = ((double)t_tdigest_modified_depth)/CLOCKS_PER_SEC;
	fprintf(summary,"%f", time_taken_tmd);

	clock_t t_sliding_depth = clock();
	sliding_window_original_depth(curves, n, 61);
	t_sliding_depth = clock() - t_sliding_depth;
	double time_taken_sd = ((double)t_sliding_depth)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_sd);

	fprintf(output,"od,od_time,fd,fd_time,td,td_time,omd,omd_time,fmd,fmd_time,tmd,tmd_time,sd,sd_time\n");
	for(s32 i = 0; i < n; i++) {
		curve_write_to_file(output,curves[i]);
	}

}


int main(int argc, char *argv[]) {
	srand ( time(NULL) );

	FILE *fp;
	char *filename;
	char *outputname;

	s32 main = 0;
	if (main == 0) {
		f64 c0[] = {1.0, 4.0};
		f64 c1[] = {2.0, 2.0};
		f64 c2[] = {3.0, 1.0};

		Curve *curves[3];
		curves[0] = curve_new_curve_from_array(2,c0);
		curves[1] = curve_new_curve_from_array(2,c1);
		curves[2] = curve_new_curve_from_array(2,c2);

		curve_print_all_curves(curves, 3);

		for (s32 i=0; i<curves[0]->num_points; ++i) {
			printf("%f ", curves[0]->pointwise_depths[i]);
		};

		pointwise_depth(curves[0], curves, 3);

		for (s32 i=0; i<curves[0]->num_points; ++i) {
			printf("%f ", curves[0]->pointwise_depths[i]);
		};

		return 0;
	}

	if (argc < 2) {
		printf("Missing filename\n");
		return(-1);
	} else {
		filename = argv[1];
		outputname = argv[2];

		printf("Filename: %s\n", filename);
		printf("Output base name: %s\n", outputname);

		fp = fopen(filename,"r");
		if(fp) {
			s32 n_rows, n_points;
			fscanf(fp,"%d %d", &n_rows,&n_points);
			Curve *curves[n_rows];
			for (s32 i=0; i<n_rows; ++i) {
				f64 aux[n_points];
				for (s32 j=0; j<n_points; ++j) {
					fscanf(fp,"%lf",&aux[j]);
				}

				curves[i] = curve_new_curve_from_array(n_points, aux);
			}

			/**/
			s32 **rank_matrix = (s32**)malloc(n_points * sizeof(s32*));
			for (int i=0; i<n_points; ++i) {
				rank_matrix[i] = (s32*)malloc(n_rows * sizeof(s32));
			}

			char *output_ending = "_out.txt";
			char outputname_cp[1000];
			strcpy(outputname_cp, outputname);
			char *summary_ending = "_summary.txt";

			char *output_name = strcat(outputname,output_ending);
			printf("Output file: %s\n", output_name);

			char *summary_name = strcat(outputname_cp,summary_ending);
			printf("Summary file: %s\n\n", summary_name);

			FILE *out = fopen(output_name,"w");
			FILE *summary = fopen(summary_name,"w");

			if (out == NULL) {
			    printf("Error opening output file %s!\n", output_name);
			    exit(-1);
			}

			if (summary == NULL) {
				printf("Error opening summary file %s!\n", summary_name);
				exit(-1);
			}

			band_depths_run_and_summarize(curves, n_rows, n_points, rank_matrix, out, summary);

			for(s32 i = 0; i < n_rows; i++) {
				curve_free(curves[i]);
			}
			free(rank_matrix);


		} else {
			printf("Failed to open the file\n");
		}
	}
	return(0);

}
