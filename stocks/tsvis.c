/*
Basic c functions used in the tsvis tool.
*/

//---------------------------------------------------------------
//
// Basic Definitions
//
//---------------------------------------------------------------


typedef char   s8;
typedef int    s32;
typedef float  f32;
typedef double f64;

typedef unsigned int u32;
typedef unsigned char u8;

#include "math.c"

#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))
#define RAlign(a,b) (b*((a+b-1)/b))
#define LAlign(a,b) (b*(a/b))

#define ArrayCount(Array) (sizeof(Array) / sizeof((Array)[0]))

#define PointerDifference(b,a) (((char*)(b))-((char*)(a)))
#define OffsetedPointer(ptr,offset) ((void*) ((char*) ptr + offset))
#define RightOffsetedPointer(ptr,size,offset) ((void*) ((char*) ptr + size - offset))
#define Offset(a,b) (s64)((char*)(b) - (char*)(a))

#define Abs(x) ((x) >= 0 ? (x) : -(x))

// https://stackoverflow.com/questions/3982348/implement-generic-swap-macro-in-c
#define Swap2(x, y, t) do { t SWAP = x; x = y; y = SWAP; } while (0)
#define Swap(x,y) do { \
	u8 swap_temp[sizeof(x) == sizeof(y) ? (s32)sizeof(x) : -1]; \
	u8* xx=(u8*) &x; u8* yy=(u8*) &y; for (s32 i=0;i<sizeof(x);i++) { u8 tmp=xx[i]; xx[i]=yy[i]; yy[i]=tmp; } \
    } while(0)

#ifdef WEBASSEMBLY

#define printf(a,...)
#define Assert(a)

// thsese are 32-bit numbers offsets
extern unsigned char __heap_base;
extern unsigned char __data_end;

typedef struct {
	u32 free;
	u32 size;
	u8  data[];
} Heap;

// static s8  *memory_free = __heap_base; //  = __heap_base + 4; // avoid 0
// s8 *tsvis_free = 0;

// put a prefix on everything from this module

Heap* tsvis_heap()
{
	return (Heap*) &__heap_base;
}

u32 tsvis_heap_size()
{
	return tsvis_heap()->size;
}

u32 tsvis_heap_base_offset()
{
	return (u32) &__heap_base;
}

// this should be called before anything else
u32 tsvis_heap_free()
{
	Heap *heap = tsvis_heap();
	return heap->size - heap->free;
}

u32 tsvis_heap_used() {
	return tsvis_heap()->free;
}

// this should be called before anything else
u32 tsvis_hb()
{
	return (u32) ((char*) &__heap_base);
}

// this should be called before anything else
void tsvis_heap_init(u32 total_memory)
{
	u32 heap_base_offset = (u32) &__heap_base;
	Heap *heap = tsvis_heap();
	heap[0] = (Heap) {
		.free = 0,
		.size = total_memory - heap_base_offset - sizeof(Heap)
	};
	// cool - it clears the memory!!!
	for (s32 i=heap->free;i<heap->size;++i) {
		heap->data[i] = 0;
	}
}

void tsvis_heap_grow(u32 new_total_memory)
{
	u32 heap_base_offset = (u32) &__heap_base;
	Heap *heap = tsvis_heap();
	heap->size = new_total_memory - heap_base_offset - sizeof(Heap);
}

void tsvis_heap_clear()
{
	Heap *heap = tsvis_heap();
	heap->free = 0;
}

void *tsvis_mem_get_checkpoint()
{
	Heap *heap = tsvis_heap();
	return heap->data + heap->free;
}

void tsvis_mem_set_checkpoint(void *checkpoint)
{
	Heap *heap = tsvis_heap();
	heap->free = (u32) (((u8*) checkpoint) - heap->data);
}

void tsvis_zero_block(s8 *buffer, s32 length)
{
	for (s32 i=0;i<length;i++) {
		buffer[i] = 0;
	}
}

void *tsvis_malloc(u32 bytes)
{
	Heap *heap = tsvis_heap();
	u32 storage = RAlign(bytes, 8);
	if (heap->free + storage > heap->size) {
		return 0;
	}
	void *result = heap->data + heap->free;
	tsvis_zero_block(result, storage);
	heap->free += storage;
	return result;
}


#else

static unsigned char __heap_base = 0;
static unsigned char __data_end = 0;

#include <stdlib.h>
#include <stdio.h>

#define Assert(a)

// static s8  *memory_free = __heap_base; //  = __heap_base + 4; // avoid 0
static s8 *tsvis_free = 0;

// put a prefix on everything from this module

// this should be called before anything else
void tsvis_init()
{
}

void *tsvis_mem_get_checkpoint()
{
	return 0;
}

void tsvis_mem_set_checkpoint(void *checkpoint)
{
}

void *tsvis_malloc(int bytes)
{
	return malloc(bytes);
}

#endif

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

//---------------------------------------------------------------
//
// WebAssembly Memory Management
//
//---------------------------------------------------------------


//---------------------------------------------------------------
//
// Services
//
//---------------------------------------------------------------

#define accepted_diff  0.000001
#define constant_S 6

//
// [ Curve ... values ... ]
//
typedef struct {
	s32  num_points;
	f64  values[];
} Curve;


typedef struct {
	s32 num_curves;
	s32 max_curves;
	Curve* curves[];
} CurveList;

CurveList*
tsvis_CurveList_new(s32 max_curves)
{
	CurveList *curve_list = tsvis_malloc(sizeof(CurveList) + max_curves * sizeof(Curve*));
	if (!curve_list) { return 0; }
	curve_list[0] = (CurveList) {
		.num_curves = 0,
		.max_curves = max_curves
	};
	return curve_list;
}

s32
tsvis_CurveList_append(CurveList *self, Curve *curve)
{
	if (self->num_curves == self->max_curves) { return 0; }
	self->curves[self->num_curves] = curve;
	++self->num_curves;
	return 1;
}

Curve*
tsvis_Curve_new(s32 num_points)
{
	Curve *curve = tsvis_malloc(sizeof(Curve) + sizeof(f64) * num_points);
	if (!curve) { return 0; }
	for (s32 i=0;i<sizeof(Curve);++i) { ((u8*)curve)[i] = 0; }
	curve->num_points = num_points;
	return curve;
}

s32
tsvis_Curve_num_points(Curve* self)
{
	return self->num_points;
}

f64*
tsvis_Curve_values(Curve* self)
{
	return self->values;
}

typedef struct {
	CurveList *curve_list;
	s32 n; // num curves
	s32 p; // num points
	s32 depths;
	s32 left;
	s32 length;
} ModifiedBandDepth;


s32 mbd_count_points_between(Curve *curve1, Curve *curve2, Curve *curve3) {
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

f64* mbd_get_depths(ModifiedBandDepth *self) { return OffsetedPointer(self,self->depths); }

// f64 *depths_to_cmp;
// s32 cmp(const void *a, const void *b){
// 	s32 ia = *(s32 *)a;
// 	s32 ib = *(s32 *)b;
// 	return (depths_to_cmp[ia] > depths_to_cmp[ib]) - (depths_to_cmp[ia] < depths_to_cmp[ib]);
// }

void sort_modified_band_depth_ranks(f64 *depths, s32 *indexes, s32 first, s32 last){

	s32 i, j, pivot, temp;

	if(first<last){
		pivot=first;
		i=first;
		j=last;

		while(i<j){
			while(depths[indexes[i]]<=depths[indexes[pivot]] && i<last) { i++; }
			while(depths[indexes[j]]>depths[indexes[pivot]]) { j--; }
			if(i<j){
				temp=indexes[i];
				indexes[i]=indexes[j];
				indexes[j]=temp;
			}
		}

		temp=indexes[pivot];
		indexes[pivot]=indexes[j];
		indexes[j]=temp;
		sort_modified_band_depth_ranks(depths, indexes, first, j-1);
		sort_modified_band_depth_ranks(depths, indexes, j+1, last);

	}

}

s32* mbd_get_modified_band_depth_rank_(ModifiedBandDepth *self) {

	f64 *depths = mbd_get_depths(self);
	s32 n = self->n;

	s32 *indexes = tsvis_malloc(sizeof(s32)*n);

	for(s32 i=0;i<n; ++i) {
		indexes[i]=i;
	}

	sort_modified_band_depth_ranks(depths, indexes, 0, n-1);

	return indexes;
}

ModifiedBandDepth* mbd_modified_band_depth_run(CurveList *curve_list) {
	s32 num_curves = curve_list->num_curves;
	Curve* *curves = curve_list->curves;

	s32 n = num_curves;
	s32 p = curves[0]->num_points;

	s32 header_storage = RAlign(sizeof(ModifiedBandDepth),8);
	s32 depths_storage = RAlign(n * sizeof(f64),8);
	s32 storage = header_storage + depths_storage;

	ModifiedBandDepth *mbd = tsvis_malloc(storage);
	if (!mbd) { return 0; }
	for (s32 i=0;i<storage;++i) ((u8*) mbd)[i] = 0;

	*mbd = (ModifiedBandDepth) {
		.curve_list = curve_list,
		.n = n,
		.p = p,
		.depths = header_storage,
		.left = storage,
		.length = storage
	};

	f64 n_choose_2 = n*(n-1.0)/2.0;
	f64 *depths = mbd_get_depths(mbd);

	for(s32 k=0; k<n; ++k) {
		for(s32 i=0; i<n-1; ++i) {
			for(s32 j=i+1; j<n; ++j) {
				s32 count = mbd_count_points_between(curves[k], curves[i], curves[j]);
				f64 proportion = (1.0) * count / p;
				depths[k] += proportion;
			}
		}
		depths[k] /= n_choose_2;
	}

	printf("Modified Band Depth results...\n");
	for (s32 i=0; i<n; ++i) {
		printf("Curve[%05d]: %f\n", i, depths[i]);
	}
	printf("\n");
	s32 *ranked_indexes = mbd_get_modified_band_depth_rank_(mbd);
	for (s32 i=0; i<n; ++i) {
		printf("Curve[%05d]: %d\n", ranked_indexes[i], i);
	}

	return mbd;
}

typedef struct {
	s32 rank;
	s32 lt_minus_gt;
} ed_Aux;

typedef struct {
	CurveList *curve_list;
	s32 n; // num curves
	s32 p; // num points
	s32 k; // num different pointwise-depth values possible (n/2?)
	s32 rank_matrix; // [ col0 ] [ col1 ] ... [colN] - n x p where each column is a permutation
	s32 ltgt_abs_diff_matrix; // [ col0 ] [ col1 ] ... [colN] - n x p where each column is a permutation
	s32 cdf_matrix; // n * n
	s32 left;
	s32 length;
} ExtremalDepth;

static s32*
ed_get_rank_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->rank_matrix); }

s32
ed_get_pointwise_depth_unique_values(ExtremalDepth *self) { return self->k; }

s32
ed_get_number_of_points(ExtremalDepth *self) { return self->p; }

s32*
ed_get_extremal_depth_rank(ExtremalDepth *self) { return ed_get_rank_matrix(self) + self->p * self->n; }

static s32*
ed_get_rank_for_timestep(ExtremalDepth *self, s32 timestep) { return ed_get_rank_matrix(self) + timestep * self->n; }

static s32*
ed_get_ltgt_abs_diff_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->ltgt_abs_diff_matrix); }

static s32*
ed_get_ltgt_abs_diff_for_timestep(ExtremalDepth *self, s32 timestep) { return ed_get_ltgt_abs_diff_matrix(self) + timestep * self->n; }

s32*
ed_get_cdf_matrix(ExtremalDepth *self) { return OffsetedPointer(self,self->cdf_matrix); }

static s32*
ed_get_cdf_for_curve(ExtremalDepth *self, s32 curve_index) { return ed_get_cdf_matrix(self) + curve_index * self->k; }

static void
ed_print_cdf_raw(ExtremalDepth *self) {
	// accumulate each of the curves CDF
	for (s32 i=0;i<self->n;++i) {
		s32 *cdf_curve = ed_get_cdf_for_curve(self, i);
		for (s32 j=0;j<self->k;++j) {
			printf("%-6d ", cdf_curve[j]);
		}
		printf("\n");
	}
}

static void
ed_print_cdf(ExtremalDepth *self) {
	// accumulate each of the curves CDF
	for (s32 i=0;i<self->n;++i) {
		s32 *cdf_curve = ed_get_cdf_for_curve(self, i);
		for (s32 j=0;j<self->k;++j) {
			printf("%-6.2f ", (1.0 * cdf_curve[j])/self->p);
		}
		printf("\n");
	}
}

static void
ed_print_extremal_depth_rank(ExtremalDepth *self) {
	// accumulate each of the curves CDF
	s32 *rank = ed_get_extremal_depth_rank(self);
	for (s32 i=0;i<self->n;++i) {
		printf("%-6d ", rank[i]);
	}
	printf("\n");
}

static void
ed_print_rank(ExtremalDepth *self) {
	// accumulate each of the curves CDF
	for (s32 i=0;i<self->p;++i) {
		s32 *rank = ed_get_rank_for_timestep(self, i);
		for (s32 j=0;j<self->n;++j) {
			printf("%-6d ", rank[j]);
		}
		printf("\n");
	}
}

static void
ed_print_ltgt_abs_diff(ExtremalDepth *self) {
	// accumulate each of the curves CDF
	for (s32 i=0;i<self->p;++i) {
		s32 *rank = ed_get_ltgt_abs_diff_for_timestep(self, i);
		for (s32 j=0;j<self->n;++j) {
			printf("%-6d ", rank[j]);
		}
		printf("\n");
	}
}

static void
ed_print_ed_sorted_cdf(ExtremalDepth *self) {
	s32 *rank = ed_get_extremal_depth_rank(self);
	// accumulate each of the curves CDF
	for (s32 i=0;i<self->n;++i) {
		s32 *cdf_curve = ed_get_cdf_for_curve(self, rank[i]);
		printf("curve[%05d]: ", rank[i]);
		for (s32 j=0;j<self->k;++j) {
			printf("%-6.2f ", (1.0 * cdf_curve[j])/self->p);
		}
		printf("\n");
	}
}

//
// - input rank is a permutation of 0 .. n-1
// - where n is the number of curves
//
static void
ed_sort_rank(ExtremalDepth *self, s32 timestep, s32 *rank, rnd_State *rnd) {

	// ed_print_rank(self);

	//
	// 2^64 is more than enough
	//
	s32 stack[128];
	stack[0] = 0;
	stack[1] = self->n;
	s32 stack_count = 2;

	Curve* *curves = self->curve_list->curves;

	while (stack_count) {
		Assert(stack_count % 2 == 0);
		s32 r = stack[--stack_count];
		s32 l = stack[--stack_count];
		if (r - l <= 4) {
			// insertion sort if less than 4 elements
			for (s32 i=l;i<r;++i) {
				f64 xi = curves[rank[i]]->values[timestep];
				for (s32 j=i+1;j<r;++j) {
					f64 xj = curves[rank[j]]->values[timestep];
					if (xi > xj) {
						Swap(rank[i],rank[j]);
						xi = xj;
					}
				}
			}
		} else {
			// TODO optimize the details on this quicksort
			// it is written mostly as a proof
			s32 n = r - l;
			s32 pp[] = {
				l + rnd_next(rnd) % n,
				l + rnd_next(rnd) % n,
				l + rnd_next(rnd) % n
			};
			for (s32 i=0;i<3;++i) {
				f64 xi = curves[rank[pp[i]]]->values[timestep];
				for (s32 j=i+1;j<3;++j) {
					f64 xj = curves[rank[pp[j]]]->values[timestep];
					if (xi > xj) {
						Swap(pp[i],pp[j]);
						xi = xj;
					}
				}
			}
			Swap(rank[l], rank[pp[1]]);
			f64 xp = curves[rank[l]]->values[timestep];

			s32 lt = l;
			s32 gt = r;
			s32 i  = l+1;
			// l ----------------------------> lt                          gt                          r
			// [ elements that are less than ) [ elements that are equal ) [ elements that are great )
			while (i < gt) {
				f64 xi = curves[rank[i]]->values[timestep];
				if  (xi < xp) {
					Swap(rank[i],rank[lt]);
					++i;
					++lt;
				} else if (xi > xp) {
					--gt;
					Swap(rank[i],rank[gt]);
				} else {
					++i;
				}
			}
			stack[stack_count++] = l;
			stack[stack_count++] = lt;
			stack[stack_count++] = gt;
			stack[stack_count++] = r;
		}
	}
}

//
// [l,r)
//
static void
ed_3way_quicksort(ExtremalDepth *self, s32 *rank, s32 timestep, s32 l, s32 r) {
	if (r - l <= 1) return;

	// l ----------------------------> lt                          gt                          r
	// [ elements that are less than ) [ elements that are equal ) [ elements that are great )
	s32 lt = l;
	s32 gt = r;
	s32 xp = ed_get_cdf_for_curve(self, rank[l])[timestep];
	s32 i = l+1;
	while (i < gt) {
		s32 xi = ed_get_cdf_for_curve(self, rank[i])[timestep];
		if  (xi > xp) {
			Swap(rank[i],rank[lt]);
			++i;
			++lt;
		} else if (xi < xp) {
			--gt;
			Swap(rank[i],rank[gt]);
		} else {
			++i;
		}
	}
	ed_3way_quicksort(self, rank, timestep, l, lt);
	ed_3way_quicksort(self, rank, timestep+1, lt, gt);
	ed_3way_quicksort(self, rank, timestep, gt, r);
}


static void
ed_compute_extremal_depth_rank(ExtremalDepth *self) {

	s32 *rank = ed_get_extremal_depth_rank(self);
	for (s32 i=0;i<self->n;++i) {
		rank[i] = i;
	}

	// use msb radix sort variant
	ed_3way_quicksort(self, rank, 0, 0, self->n);
}

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
a 5 we can make x1 == x2 < x3 < ... < x7header_storage

     lt   gt   diff           abs_diff
x1   0    7-1  0-(7-1) = -6   6
x2   0    7-2  0-(7-2) = -5   5
x3   2    7-3  2-(7-3) = -2   2
x4   3    7-4  3-(7-4) =  0   0
x5   4    7-5  4-(7-5) =  2   2
x6   5    7-6  5-(7-6) =  4   4
x7   6    7-7  6-(7-7) =  6   6

*/

ExtremalDepth*
ed_extremal_depth_run(CurveList *curve_list)
{
	s32 num_curves = curve_list->num_curves;
	Curve* *curves = curve_list->curves;

	s32 n = num_curves;
	s32 p = curves[0]->num_points;
	s32 k = n+1; // 0, 1, ... n

	s32 header_storage = RAlign(sizeof(ExtremalDepth),8);
	// add an extra column for an auxiliar space
	s32 rank_matrix_storage = RAlign(n * (p + 1) * sizeof(s32),8);    // (p+1) * n
	s32 ltgt_abs_diff_matrix_storage = RAlign(n * p * sizeof(s32),8); // (p+0) * n
	s32 cdf_matrix_storage = RAlign(n * k * sizeof(s32),8);           // (n+0) * k
	s32 storage = header_storage + rank_matrix_storage + ltgt_abs_diff_matrix_storage + cdf_matrix_storage;

	ExtremalDepth *ed = tsvis_malloc(storage);
	if (!ed) { return 0; }
	for (s32 i=0;i<storage;++i) ((u8*) ed)[i] = 0;

	*ed = (ExtremalDepth) {
		.curve_list = curve_list,
		.n = n,
		.p = p,
		.k = k,
		.rank_matrix = header_storage,
		.ltgt_abs_diff_matrix = header_storage + rank_matrix_storage,
		.cdf_matrix = header_storage + rank_matrix_storage + ltgt_abs_diff_matrix_storage,
		.left = storage,
		.length = storage
	};

	rnd_State rnd = rnd_new();

	for (s32 i=0;i<p;++i) {

		s32 *rank          = ed_get_rank_for_timestep(ed, i);

		s32 *aux_ltgt_diff = ed_get_rank_for_timestep(ed, i+1);

		s32 *ltgt_abs_diff = ed_get_ltgt_abs_diff_for_timestep(ed, i);

		for (s32 j=0;j<n;++j) {
			rank[j] = j;
			aux_ltgt_diff[j] = 0;
		}

		// sort columns based on curve values
		ed_sort_rank(ed, i, rank, &rnd);

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
			ltgt_abs_diff[rank[j]] = abs_diff;
			// 1 - (abs_diff) / n == (n - abs_diff) / n == index
			//
			// index on the CDF is n - abs_diff and varies from 0 to n
			//
			s32 *cdf_curve = ed_get_cdf_for_curve(ed, rank[j]);
			++cdf_curve[n - abs_diff];
		}
	}

	// accumulate each of the curves CDF
	for (s32 i=0;i<ed->n;++i) {
		s32 *cdf_curve = ed_get_cdf_for_curve(ed, i);
		s32 cum = 0;
		for (s32 j=0;j<ed->k;++j) {
			cum += cdf_curve[j];
			cdf_curve[j] = cum;
		}
	}

	printf("Rank\n");
	ed_print_rank(ed);

	printf("ltgt_abs_diff\n");
	ed_print_ltgt_abs_diff(ed);

	printf("CDF\n");
	ed_print_cdf(ed);

	// TODO final sorting based on the CDF
	ed_compute_extremal_depth_rank(ed);

	printf("Extremal Depth Rank\n");
	ed_print_extremal_depth_rank(ed);

	//
	printf("Curves Sorted by Extremal Depth\n");
	ed_print_ed_sorted_cdf(ed);

	return ed;

}

// sanity check
f64 sum_f64(f64 *a, int len)
{
	f64 sum = 0;
	for(int i = 0; i < len; i++) {
		sum += a[i];
	}
	return sum;
}

// sanity check
s32 checksum(s32 *a, int len)
{
	s32 sum = 0;
	for(int i = 0; i < len; i++) {
		sum = ((a[i] & 0x3) << (2 * i)) + sum;
	}
	return sum;
	// 00 01 10
}

typedef struct {
	s32 rows;
	s32 cols;
	f32 data[];
} Matrix;


f32*
matrix_get_data(Matrix *self) { return &self->data[0]; }

static s32
matrix_accumulate(Matrix *self, s32 row, s32 col, f32 value)
{
	if (row < 0 || row >= self->rows || col < 0 || col >= self->cols) { return 0; }
	self->data[row * self->cols + col] += value;
	return 1;
}

static void
matrix_print(Matrix *self)
{
	// print it upside down
	for (s32 i=self->rows-1;i>=0;--i) {
		for (s32 j=0;j<self->cols;++j) {
			printf("%10.3g ", self->data[i * self->cols + j]);
		}
		printf("\n");
	}
}

typedef struct {
	f32 x;
	f32 y;
} v2_f32;

// assumes |(ndx,ndy)| = sqrt(ndx^2 + ndy^2) = 1
static f32
v2_f32_length_squared(v2_f32 v)
{
	return v.x * v.x + v.y * v.y;
}

static f32
v2_f32_length(v2_f32 v)
{
	return f32_sqrt(v2_f32_length_squared(v));
}

static v2_f32
v2_f32_subtract(v2_f32 a, v2_f32 b)
{
	return (v2_f32) { .x = a.x - b.x, .y = a.y - b.y };
}

static v2_f32
v2_f32_normalize(v2_f32 v)
{
	f32 length = v2_f32_length(v);
	return (v2_f32) { .x = v.x/length, .y = v.y/length };
}

// assumes |(ndx,ndy)| = sqrt(ndx^2 + ndy^2) = 1
static v2_f32
next_grid_intersection(f32 x, f32 y, f32 ndx, f32 ndy)
{
	//
	// (1, tg_theta)
	//
	// (x, y) + step_x * (ndx, ndy)
	// (x, y) + step_y * (ndx, ndy)
	//

	Assert(ndx > 0);
	f32 next_x = (s32) (1 + f32_floor(x));
	if (ndy == 0) {
		return (v2_f32) { .x = next_x, .y = y };
	} else if (ndy > 0) {
		f32 next_y = (s32) (1 + f32_floor(y));
		//
		// step_x * ndx = next_x - x
		// step_x = (next_x - x) / ndx
		//
		// step_y * ndy = next_y - y
		// step_y = (next_y - y) / ndy
		//
		f32 step_x = (next_x - x) / ndx;
		f32 step_y = (next_y - y) / ndy;
		if (step_x <= step_y) {
			return (v2_f32) { .x = next_x, .y = y + step_x * ndy};
		} else {
			return (v2_f32) { .x = x + step_y * ndx, .y = next_y };
		}
	} else {
		//
		// -1.5 ----> (int) -2.5 ----> -2
		// -2.9 ----> (int) -3.9 ----> -3
		// -2   ----> (int) -3 ----> -3
		//
		f32 floor_y = f32_floor(y);
		f32 next_y = (y == floor_y) ? floor_y-1 : floor_y;
		f32 step_x = (next_x - x) / ndx;
		f32 step_y = (next_y - y) / ndy;
		if (step_x <= step_y) {
			return (v2_f32) { .x = next_x, .y = y + step_x * ndy};
		} else {
			return (v2_f32) { .x = x + step_y * ndx, .y = next_y };
		}
	}
	Assert(0);
	return (v2_f32) { .x = 0, .y = 0 };
}

#if 1
Matrix*
curves_density_matrix(CurveList *curve_list, s32 rows, s32 cols, f32 viewbox_x, f32 viewbox_y, f32 viewbox_dx, f32 viewbox_dy)
{

	u32 matrix_storage = sizeof(Matrix) + rows * cols * sizeof(f32);

	Matrix *result = tsvis_malloc(matrix_storage);
	result[0] = (Matrix) {
		.rows = rows,
		.cols = cols
	};
	if (!result) return 0;

	// there is enough space to compute things

	for (s32 i=0;i<curve_list->num_curves;++i) {

		Curve *c = curve_list->curves[i];
		s32 has_prev = 0;
		v2_f32 prev = { 0 };

		s32 cell_x = -1;
		s32 cell_y_min = 0;
		s32 cell_y_max = 0;
		for (s32 j=0;j<c->num_points;++j) {
			f32 x = j;
			f32 y = c->values[j];
			v2_f32 curr = {
				.x = ((x - viewbox_x)/viewbox_dx) * cols,
				.y = ((y - viewbox_y)/viewbox_dy) * rows
			};
			if (has_prev) {
				// trace all the intersections
				v2_f32 direction = v2_f32_subtract(curr, prev);
				f32 length_squared = v2_f32_length_squared(direction);
				v2_f32 norm_direction = v2_f32_normalize(direction);

				// iterate through the cells hit by the current segment
				{
					v2_f32 p = prev;
					while (1) {
						// get cell of point
						//
						s32 cx = (s32) f32_floor(p.x);
						s32 cy = (s32) f32_floor(p.y);
						if (norm_direction.y < 0) {
							if (f32_floor(p.y) == p.y) { cy = cy - 1; }
						}

						// assumes cx never decreases
						if (cell_x < 0) {
							cell_x = cx;
							cell_y_min = cell_y_max = (s32) cy;
						} else if (cell_x == cx) {
							cell_y_min = Min(cy, cell_y_min);
							cell_y_max = Max(cy, cell_y_max);
						} else {
							printf("curve:%05d column:%04d row_range:%04d,%04d\n", i, cell_x, cell_y_min, cell_y_max);

							s32 cells_hit_by_this_curve_on_cell_x = cell_y_max - cell_y_min + 1;
							for (s32 k=cell_y_min;k<=cell_y_max;++k) {
								matrix_accumulate(result, k, cell_x, 1.0f/cells_hit_by_this_curve_on_cell_x);
							}

							cell_x = cx;
							cell_y_min = cell_y_max = (s32) cy;
						}

						// printf("curve:%05d segment:%03d cell:%04d,%04d\n", i, j-1, cx, cy);
						p = next_grid_intersection(p.x, p.y, norm_direction.x, norm_direction.y);
						f32 current_length_squared = v2_f32_length_squared(v2_f32_subtract(p, prev));
						if (current_length_squared > length_squared) {
							break;
						}
					}
				}
			}
			has_prev = 1;
			prev = curr;
		}
		if (cell_x >= 0) {
			s32 cells_hit_by_this_curve_on_cell_x = cell_y_max - cell_y_min + 1;
			for (s32 k=cell_y_min;k<=cell_y_max;++k) {
				matrix_accumulate(result, k, cell_x, 1.0f/cells_hit_by_this_curve_on_cell_x);
			}
			printf("curve:%05d column:%04d row_range:%04d,%04d\n", i, cell_x, cell_y_min, cell_y_max);
		}
	}

	return result;

}
#endif

#ifndef WEBASSEMBLY

static void
test_extremal_depth()
{
#if 1
	// Example from Figure 1 of the Extremal Depth paper
	// f64 curves_data[] = {
	// 	0, 0, 0,
	// 	1, 1, 1,
	// 	2, 2, 2,
	// 	3, 3, 3,
	// 	4, 4, 4
	// };
	// s32 n = 3;
	// s32 p = 3;

	// f64 curves_data[] = {
	// 	0.1, -5.0, -4.0, -3.0,
	// 	0.0,  1.0,  2.1,  3.0,
	// 	6.1,  1.1,  8.0,  9.2,
	// 	6.2,  7.0,  2.0,  9.4,
	// 	6.0,  7.1,  8.1,  9.3
	// };

	f64 curves_data[] = {
			 2.00,  2.10,  1.80,  1.52,  0.60, -0.50,
			 1.50,  1.50,  1.50,  1.51,  1.40,  1.40,
			 1.10,  1.10,  1.30,  1.20,  1.20,  1.30,
			 1.00,  0.90,  1.10,  1.50,  2.30,  3.50,
			 0.60,  0.50,  0.11, -0.60, -1.50, -2.60,
			 0.00,  0.40,  0.10,  0.20,  0.10, -0.30,
			-0.80, -0.70, -0.30, -0.30, -0.60, -0.60,
			-1.40, -1.10, -1.00, -1.10, -1.40, -1.60
		};

	s32 n = 8;
	s32 p = 6;

	CurveList *curve_list = tsvis_CurveList_new(n);

	s32 offset = 0;
	for (s32 i=0;i<n;++i) {
		Curve *curve = tsvis_Curve_new(p);
		for (s32 j=0;j<p;j++) {
			curve->values[j] = curves_data[offset + j];
		}
		tsvis_CurveList_append(curve_list, curve);
		offset += p;
	}
#else
	rnd_State rnd = rnd_new();

	s32 n = 15;
	s32 p = 365;

	CurveList *curve_list = tsvis_CurveList_new(n);

	s32 offset = 0;
	for (s32 i=0;i<n;++i) {
		Curve *curve = tsvis_Curve_new(p);
		for (s32 j=0;j<p;j++) {
			curve->values[j] = rnd_next(&rnd); // curves_data[offset + j];
		}
		tsvis_CurveList_append(curve_list, curve);
		offset += p;
	}

#endif



	// compue extremal depth
	ExtremalDepth *ed = ed_extremal_depth_run(curve_list);
	// ModifiedBandDepth *mbd = mbd_modified_band_depth_run(curve_list);
	// s32 *rank = ed_get_extremal_depth_rank(ed);
	// for (s32 i=0;i<ed->n;++i) {
	// 	printf("curve[%d] rank: %d\n", rank[i]+1, i+1);
	// 	//curves[rank[i]].ed_rank = (1.0*i)/ed->n;
	// }

}

static void
test_next_grid_intersection()
{
	// f32 ndx = 1, ndy = 0;
	// f32 ndx = 0.8660254, ndy = -0.5;

	v2_f32 u = { .x = 1, .y = 5 };
	v2_f32 v = { .x = 2, .y = 3 };
	v2_f32 dir = v2_f32_subtract(v, u);
	f32    length_squared = v2_f32_length_squared(dir);
	v2_f32 norm_dir = v2_f32_normalize(dir);

	s32 min_x = (s32) (Min(f32_floor(u.x), f32_floor(v.x)));
	s32 min_y = (s32) (Min(f32_floor(u.y), f32_floor(v.y)));
	s32 max_x = (s32) (Max(f32_ceil(u.x), f32_ceil(v.x)));
	s32 max_y = (s32) (Max(f32_ceil(u.y), f32_ceil(v.y)));

	printf("#!/bin/bash\n");
	printf("cat <<EOF > tmp_grid.R\n");
	printf("pdf('grid.pdf',width=10, height=10)\n");
	printf("x <- matrix(c(\n");

	v2_f32 p = u;
	s32 first_point = 1;
	while (1) {
		if (!first_point) printf(",");
		first_point = 0;
		printf("%f,%f\n", p.x, p.y);
		p = next_grid_intersection(p.x, p.y, norm_dir.x, norm_dir.y);
		f32 current_length_squared = v2_f32_length_squared(v2_f32_subtract(p, u));
		if (current_length_squared > length_squared) {
			break;
		}
	}
	printf("),ncol=2,byrow=T)\n");
	printf("plot(x,type='p')\n");
	printf("abline(h=(%d):(%d),col=gray(0.8))\n", min_y, max_y);
	printf("abline(v=(%d):(%d),col=gray(0.8))\n", min_x, max_x);
	printf("dev.off()\n");
	printf("EOF\n");
	printf("R -f tmp_grid.R\n");
	printf("open grid.pdf\n");
}

static void
test_curves_density_matrix()
{
	f64 curves_data[] = {
		1, 0.9031405731204399, 0.8938352437347997, 0.8938352437347997,
		0.8938352437347997, 0.8724754361848367, 0.8843184625145396,
		0.8888653695675162, 0.8941524584963519, 0.8773395474251877
	};

	s32 n = 1;
	s32 p = 10;

	CurveList *curve_list = tsvis_CurveList_new(n);

	s32 offset = 0;
	for (s32 i=0;i<n;++i) {
		Curve *curve = tsvis_Curve_new(p);
		for (s32 j=0;j<p;j++) {
			curve->values[j] = curves_data[offset + j];
		}
		tsvis_CurveList_append(curve_list, curve);
		offset += p;
	}

	s32 rows 	   = 41;
	s32 cols 	   = 153;
	f32 viewbox_x  = 0;
	f32 viewbox_y  = 0.8724754;
	f32 viewbox_dx = 9;
	f32 viewbox_dy = 0.1275245;


	// s32 rows = 4;
	// s32 cols = 6;
	Matrix *matrix = curves_density_matrix(curve_list, rows, cols, viewbox_x, viewbox_y, viewbox_dx, viewbox_dy);

	matrix_print(matrix);

}

int
main(int argc, char *argv[])
{
	test_extremal_depth();
	// test_next_grid_intersection();
	// test_curves_density_matrix();
	return 0;
}

#endif
