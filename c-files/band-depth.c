#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <limits.h>
#include <inttypes.h>


#include "band-depth.h"

//-- Assert -----------------------------------------------------------------------

char* failed_assertion_(const char *expression, const char *filename, int line)
{
	char time_buffer[32];
	time_t rawtime;
	struct tm * timeinfo;
	time ( &rawtime );
	timeinfo = localtime ( &rawtime );
	strftime(time_buffer, sizeof(time_buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
	// char buffer[Kilobytes(1)];
	char *log_filename=".log";
	FILE *f = fopen(log_filename,"a");
	fprintf(f, "[%s] %s:%d: Assertion `%s` failed.\n", time_buffer, filename, line, expression);
	fclose(f);
	abort();
}

#if CHECK_ASSERTIONS
#define Assert(EX) (void) ((EX) || (failed_assertion_(#EX, __FILE__, __LINE__),0))
#else
#define Assert(Expression)
#endif

//------------------------------------------------------------------------------


//-- Simple Random Generator ---------------------------------------------------
//
// https://stackoverflow.com/questions/1640258/need-a-fast-random-generator-for-c
//
typedef struct {
	u32 x;
	u32 y;
	u32 z;
} rnd_State;

rnd_State rnd_new() {          //period 2^96-1
	return (rnd_State) {
		.x = 123456789,
		.y = 362436069,
		.z = 521288629
	};
}

u32 rnd_next(rnd_State *state) {          //period 2^96-1
	u32 t;
	state->x ^= state->x << 16;
	state->x ^= state->x >> 5;
	state->x ^= state->x << 1;

	t = state->x;
	state->x = state->y;
	state->y = state->z;
	state->z = t ^ state->x ^ state->y;

	return state->z;
}
//-- Simple Random Generator ---------------------------------------------------










// interface to C++ library
#include "tdigest_glue.h"


f64 get_number_with_prob(f64 prob, f64 val1, f64 val2) {
	f64 random_number = (f64)rand() / (f64)RAND_MAX;
	if(random_number < prob) {
		return val1;
	} else {
		return val2;
	}
}


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
			curve->values[i] = (i + (c*sigma*constant_S));
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
	// SORTING ROWS OF VALUE MATRIX
	**/
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
	// BUILDING RANK MATRIX
	*/
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
	/*
	for (s32 i=0; i<size; ++i) {
		for (s32 j=0; j<n; ++j) {
			printf("%d  ", rank_matrix[i][j]);
		}
		printf("\n");
	}
	printf("\n");
	*/
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

/* ************* EXTREMAL DEPTH HELPER FUNCTIONS ************* */

void pointwise_depth(Curve *curve, Curve* *curves, s32 n) {

	s32 size = curves[0]->num_points;
	for(s32 i=0; i<size; ++i) {
		s32 count = 0;
		for (s32 j=0; j<n; ++j) {
			count += ((curves[j]->values[i] < curve->values[i]) - (curves[j]->values[i] > curve->values[i]));
		}
		curve->pointwise_depths[i] = 1 - ((1.0*abs(count))/n);
		// curve->pointwise_depths[i] = count;
		// printf("%f\n", curve->pointwise_depths[i]);
	};
}


typedef struct {
	s32 rank;
	s32 lt_minus_gt;
} ed_Aux;

typedef struct {
	Curve* *curves;
	s32 n; // num curves
	s32 p; // num points
	s32 k; // num different pointwise-depth values possible (n/2?)
	s32 rank_matrix; // [ col0 ] [ col1 ] ... [colN] - n x p where each column is a permutation
	s32 ltgt_abs_diff_matrix; // [ col0 ] [ col1 ] ... [colN] - n x p where each column is a permutation
	s32 cdf_matrix; // n * n
	s32 left;
	s32 length;
} ExtremalDepth;

static s32 ed_cmp(const void *a, const void *b, void *context_raw)
{
	s32 aa = ((s32*)a)[0];
	s32 bb = ((s32*)b)[0];
	ed_SortColumn *context = (ed_SortColumn*) context_raw;

	ExtremalDepth *ed = context->ed;
	s32 column = context->column;

	f64 val_aa = ed->curves[aa]->values[column];
	f64 val_bb = ed->curves[bb]->values[column];

	if (val_aa < val_bb) return -1;
	else if (val_aa > val_bb) return 1;
	else return 0;
}

static s32*
ed_sort_rank(ExtremalDepth *self, s32 column, s32 *p) {
	//
	// 2^64 is more than enough
	//
	s32 stack[128];
	stack[0] = 0;
	stack[1] = n;
	s32 stack_count = 2;

	rnd_State rnd = rnd_new();

	while (stack_count) {
		Assert(stack_count % 2 == 0);
		r = stack[--stack_count];
		l = stack[--stack_count];
		if (r - l <= 4) {
			// insertion sort if less than 4 elements
			for (s32 i=l;i<r;++i) {
				Curve *c_i = self->curves[p[i]];
				f64 xi = self->curves[p[i]]->values[column];
				for (s32 j=l+1;j<r;++j) {
					f64 xj = self->curves[p[j]]->values[column];
					if (xi > xj) {
						Swap(p[i],p[j]);
						xi = xj;
					}
				}
			}
		} else {
			s32 n = r - l;
			s32 pp[] = {
				l + rnd_next(&rnd) % n,
				l + rnd_next(&rnd) % n,
				l + rnd_next(&rnd) % n
			};
			for (s32 i=0;i<3;++i) {
				f64 xi = self->curves[pp[i]]->values[column];
				for (s32 j=1;j<3;++j) {
					f64 xj = self->curves[pp[j]]->values[column];
					if (xi > xj) {
						Swap(p[i],p[j]);
						xi = xj;
					}
				}
			}
			s32 pivot = pp[i];
			f64 xp = self->curves[pivot]->values[column];
			s32 a = l;
			s32 b = r-1;
			for (;;) {
				while (a < b) {
					f64 xa = self->curves[p[a]]->values[column];
					if (xa <= xp) { ++a; }
					else { break; }
				}
				for (;;) {
					f64 xb = self->curves[p[b]]->values[column];
					if (xp < xb) { --b; }
					else { break; }
				}
				if (a < b) {
					Swap(p[a], p[b]);
				} else {
					break;
				}
			}
			stack[stack_count++] = l;
			stack[stack_count++] = a;
			stack[stack_count++] = a+1;
			stack[stack_count++] = r;
		}
	}
}





static s32*
ed_get_rank_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->rank_matrix); }

static s32*
ed_get_rank_for_timestep(ExtremalDepth *self, s32 timestep) { return ed_get_rank_matrix(self) + timestep * self->p * sizeof(s32); }

static s32*
ed_get_ltgt_abs_diff_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->ltgt_abs_diff_matrix); }

static s32*
ed_get_ltgt_abs_diff_for_timestep(ExtremalDepth *self, s32 timestep) { return ed_get_ltgt_abs_diff_matrix(self) + timestep * self->p * sizeof(s32); }

static s32*
ed_get_cdf_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->cdf_matrix); }

static s32*
ed_get_cdf_for_curve(ExtremalDepth *self, s32 curve_index) { return ed_get_cdf_matrix(self) + curve_index * self->k * sizeof(s32); }

/*

Notes on extremal depth

Let x1 < x2 < ... < x7

in this case the possible values of abs_diffof

     diff     = lt - gt

     abs_diff = abs(diff)

     lt   gt   diff           abs_diff
x1   0    7-1  0-(7-1) = -6   6
x2   1    7-2  1-(7-2) = -4   4
x3   2    7-3  2-(7-3) = -2   2
x4   3    7-4  3-(7-4) =  0   0
x5   4    7-5  4-(7-5) =  2   2
x6   5    7-6  5-(7-6) =  4   4
x7   6    7-7  6-(7-7) =  6   6

note that any difference between 0 and n-1 can be genrated if we
allow for numbers being equal. For example, when n=7, to generate
a 5 we can make x1 == x2 < x3 < ... < x7

     lt   gt   diff           abs_diff
x1   0    7-1  0-(7-1) = -6   6
x2   0    7-2  0-(7-2) = -5   5
x3   2    7-3  2-(7-3) = -2   2
x4   3    7-4  3-(7-4) =  0   0
x5   4    7-5  4-(7-5) =  2   2
x6   5    7-6  5-(7-6) =  4   4
x7   6    7-7  6-(7-7) =  6   6

*/

static ExtremalDepth*
ed_extrmal_depth_run(Curve* *curves, s32 num_curves)
{
	s32 n = num_curves;
	s32 p = curves[0]->num_points;
	s32 k = n-1; // possible values for abs_diff

	s32 header_storage = RAlign(sizeof(ExtremalDepth),8);
	// add an extra column for an auxiliar space
	s32 rank_matrix_storage = RAlign(n * (p + 1) * sizeof(s32),8);    // (p+1) * n
	s32 ltgt_abs_diff_matrix_storage = RAlign(n * p * sizeof(s32),8); // (p+0) * n
	s32 cdf_matrix_storage = RAlign(n * k * sizeof(s32),8);           // (n+0) * k
	s32 storage = header_storage + rank_matrix_storage + ltgt_abs_diff_matrix_storage + cdf_matrix_storage;

	ExtremalDepth *ed = malloc(storage);

	*ed = (ExtremalDepth) {
		.curves = curves,
		.n = n,
		.p = p,
		.rank_matrix = header_storage,
		.ltgt_abs_diff_matrix = header_storage + rank_matrix_storage,
		.cdf_matrix = header_storage + rank_matrix_storage + ltgt_abs_diff_matrix_storage,
		.left = (s32) sizeof(ExtremalDepth),
		.length = storage
	};

	for (s32 i=0;i<p;++i) {

		s32 *rank          = ed_get_rank_for_timestep(ed, i);

		s32 *aux_ltgt_diff = ed_get_rank_for_timestep(ed, i+1);

		s32 *ltgt_abs_diff = ed_get_ltgt_abs_diff_for_timestep(ed, i);

		for (s32 j=0;j<n;++j) {
			rank[j] = j;
			aux_ltgt_diff[j] = 0;
		}

		// sort columns based on curve values
		ed_sort_rank(ed, i, rank);

		// curve: 3 2 1 4 0
		// value: 1 2 2 3 5
		//
		// pass1: 0 1 1 3 4
		// pass2: 0 1 1 3 4
		//
		// count +1 for each curve lower than j-th
		// count -1 for each curve lower than j-th
		//
		f64 last_value = curves[rank[0]]->values[i];
		s32 cum = 0;
		for (s32 j=1;j<n;++j) {
			f64 v = curves[rank[j]]->values[i];
			if (last_value < v) {
				cum = j;
				aux_ltgt_diff[j] += cum;
			} else {
				aux_ltgt_diff[j] += cum;
			}
		}

		last_value = curves[rank[n-1]]->values[i];
		cum = 0;
		for (s32 j=n-2;j>=0;--j) {
			f64 v = curves[rank[j]]->values[i];
			if (last_value > v) {
				cum = n-1-j;
				aux_ltgt_diff[j] -= cum;
			} else {
				aux_ltgt_diff[j] -= cum;
			}
		}

		for (s32 j=0;j<n;++j) {
			s32 abs_diff = Abs(aux_ltgt_diff[j]);
			ltgt_abs_diff[p[j]] = abs_diff;
			s32 *cdf_curve = ed_get_cdf_for_curve(ed, p[j]);
			++cdf_curve[abs_diff];
		}

		// for (s32 j=0; j<n; ++j) {
		// 	count += ((curves[j]->values[i] < curve->values[i]) - (curves[j]->values[i] > curve->values[i]));
		// }
		// curve->pointwise_depths[i] = 1 - ((1.0*abs(count))/n);

	}
}

static void
ed_example()
{
	// Example from Figure 1 of the Extremal Depth paper
	f64 curves[] = {
		2.0,  2.1,  1.8,  1.5,  0.6, -0.5,
		1.5,  1.5,  1.5,  1.5,  1.4,  1.4,
		1.1,  1.1,  1.3,  1.2,  1.2,  1.3,
		1.0,  0.9,  1.1,  1.5,  2.3,  3.5,
		0.6,  0.5,  0.1, -0.6, -1.5, -2.6,
		0.0,  0.4,  0.1,  0.2,  0.1, -0.3,
		-0.8, -0.7, -0.3, -0.3, -0.6, -0.6,
		-1.4, -1.1, -1.0, -1.1, -1.4, -1.6
	};

	Curve *curves[8];
	for (s32 i=0;i<8;++i) {
		curves[i] = curve_new_curve_from_array(6, curves + 6 * i);
	}

	// compue extremal depth
	ExtremalDepth *ed = ed_extrmal_depth_run(curves, 8);


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
	fprintf(summary,"%d,", (s32) size_matrix);

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


	t_digest_run(summary, curves, n, size);

	/*
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
	*/

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

#if 1
	ed_example()
#else
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
		printf("\n");

		pointwise_depth(curves[0], curves, 3);

		for (s32 i=0; i<curves[0]->num_points; ++i) {
			printf("%f ", curves[0]->pointwise_depths[i]);
		};
		printf("\n");

		printf("starting ed...\n");
		ExtremalDepth *ed = ed_extrmal_depth_run(curves, 3);
		printf("ending ed...\n");

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
#endif
	return(0);
}
