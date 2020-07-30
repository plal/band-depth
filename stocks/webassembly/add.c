//
// Filename: add.c
//

/*
What is the first application?
- rans
*/
// #include <emscripten.h>
// #include <math.h>

typedef char  s8;
typedef int   s32;
typedef float f32;

typedef unsigned int u32;
typedef unsigned char u8;

#define Min(a,b) (((a)<(b))?(a):(b))
#define Max(a,b) (((a)>(b))?(a):(b))
#define RAlign(a,b) (b*((a+b-1)/b))
#define LAlign(a,b) (b*(a/b))

// #define Clamp(x,a,b) (((x)<(a)) ? (a) : (((x)>(b)) ? (b) : (x)))
// https://stackoverflow.com/questions/3982348/implement-generic-swap-macro-in-c
// #define Swap2(x, y, t) do { t SWAP = x; x = y; y = SWAP; } while (0)
// #define Swap(x,y) do \
// { unsigned char swap_temp[sizeof(x) == sizeof(y) ? (s32)sizeof(x) : -1]; \
// 	memcpy(swap_temp,&y,sizeof(x)); \
// 	memcpy(&y,&x,       sizeof(x)); \
// 	memcpy(&x,swap_temp,sizeof(x)); \
// } while(0)

// this are 32-bit numbers offset
extern s8  *__heap_base;
extern s8  *__data_end;

// static s8  *memory_free = __heap_base; //  = __heap_base + 4; // avoid 0

static s8 *rans_free = 0;

// put a prefix on everything from this module

// this should be called before anything else
void rans_init()
{
	rans_free = __heap_base + 4;
}

void *rans_mem_get_checkpoint()
{
	return rans_free;
}

void rans_mem_set_checkpoint(void *checkpoint)
{
	rans_free = checkpoint;
}

//
// 4 align all reserve calls
//
void *rans_malloc(int bytes)
{
	void *result = rans_free;
	rans_free += RAlign(bytes,4);
	return result;
}

// sanity check
int rans_sum(int *a, int len) {
	int sum = 0;
	for(int i = 0; i < len; i++) {
		sum += a[i];
	}
	return sum;
}

/*
https://chromium.googlesource.com/external/github.com/WebAssembly/musl/+/landing-branch/src/math/logf.c
*/

static const f32
ln2_hi = 6.9313812256e-01, /* 0x3f317180 */
ln2_lo = 9.0580006145e-06, /* 0x3717f7d1 */
/* |(log(1+s)-log(1-s))/s - Lg(s)| < 2**-34.24 (~[-4.95e-11, 4.97e-11]). */
Lg1 = 0xaaaaaa.0p-24, /* 0.66666662693 */
Lg2 = 0xccce13.0p-25, /* 0.40000972152 */
Lg3 = 0x91e9ee.0p-25, /* 0.28498786688 */
Lg4 = 0xf89e26.0p-26; /* 0.24279078841 */
f32 logf(f32 x)
{
	union {f32 f; u32 i;} u = {x};
	f32 hfsq,f,s,z,R,w,t1,t2,dk;
	u32 ix;
	int k;
	ix = u.i;
	k = 0;
	if (ix < 0x00800000 || ix>>31) {  /* x < 2**-126  */
		if (ix<<1 == 0)
			return -1/(x*x);  /* log(+-0)=-inf */
		if (ix>>31)
			return (x-x)/0.0f; /* log(-#) = NaN */
		/* subnormal number, scale up x */
		k -= 25;
		x *= 0x1p25f;
		u.f = x;
		ix = u.i;
	} else if (ix >= 0x7f800000) {
		return x;
	} else if (ix == 0x3f800000)
		return 0;
	/* reduce x into [sqrt(2)/2, sqrt(2)] */
	ix += 0x3f800000 - 0x3f3504f3;
	k += (int)(ix>>23) - 0x7f;
	ix = (ix&0x007fffff) + 0x3f3504f3;
	u.i = ix;
	x = u.f;
	f = x - 1.0f;
	s = f/(2.0f + f);
	z = s*s;
	w = z*z;
	t1= w*(Lg2+w*Lg4);
	t2= z*(Lg1+w*Lg3);
	R = t2 + t1;
	hfsq = 0.5f*f*f;
	dk = k;
	return s*(hfsq+R) + dk*ln2_lo - hfsq + f + dk*ln2_hi;
}


f32 rans_log(f32 value) {
	return logf(value);
}



//
// a simple task sort an array of integers
//
// int rans_sort()
// {
//
// }
//
// int add(int a, int b) {
// 	return a*a + b;
// }
//
// A configuration storage that encodes data that can be used as url state.
//
