#include <stdint.h>
#include <inttypes.h>
#include <iostream>
#include <algorithm>

#include "tdigest_glue.h"
#include "libs/TDigest.h"

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

s32 t_digest_run(FILE *summary, Curve* *curves, s32 n, s32 size)
{
	clock_t t_tdigests_build = clock();
	std::vector<PDigest*> tdigests = t_digest_build(curves, n, size);
	t_tdigests_build = clock() - t_tdigests_build;
	double time_taken_tdb = ((double)t_tdigests_build)/CLOCKS_PER_SEC; // in seconds
	fprintf(summary,"%f,", time_taken_tdb);

	s64 size_tdigests = sizeof(*tdigests[0]) * tdigests.size();
	fprintf(summary,"%d,", (s32) size_tdigests);

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

	return 0;
}




