/*
https://chromium.googlesource.com/external/github.com/WebAssembly/musl/+/landing-branch/src/math/sqrtf.c
https://chromium.googlesource.com/external/github.com/WebAssembly/musl/+/landing-branch/src/internal/libm.h
*/

// } else if (sizeof(x) == sizeof(f64)) {    \

#define FORCE_EVAL(x) do {                        \
	if (sizeof(x) == sizeof(f32)) {           \
		volatile f32 __x;                 \
		__x = (x);                        \
	} else {                                  \
		volatile f64 __x;                 \
		__x = (x);                        \
	}                                         \
} while(0)


/* Set a f32 from a 32 bit int.  */
#define SET_FLOAT_WORD(d,w)                       \
do {                                              \
  union {f32 f; u32 i;} __u;                      \
  __u.i = (w);                                    \
  (d) = __u.f;                                    \
} while (0)

/* Get a 32 bit int from a f32.  */
#define GET_FLOAT_WORD(w,d)                       \
do {                                              \
  union {f32 f; u32 i;} __u;               \
  __u.f = (d);                                    \
  (w) = __u.i;                                    \
} while (0)

static const f32 tiny = 1.0e-30;
f32 f32_sqrt(f32 x)
{
	f32 z;
	s32 sign = (int)0x80000000;
	s32 ix,s,q,m,t,i;
	u32 r;
	GET_FLOAT_WORD(ix, x);
	/* take care of Inf and NaN */
	if ((ix&0x7f800000) == 0x7f800000)
		return x*x + x; /* sqrt(NaN)=NaN, sqrt(+inf)=+inf, sqrt(-inf)=sNaN */
	/* take care of zero */
	if (ix <= 0) {
		if ((ix&~sign) == 0)
			return x;  /* sqrt(+-0) = +-0 */
		if (ix < 0)
			return (x-x)/(x-x);  /* sqrt(-ve) = sNaN */
	}
	/* normalize x */
	m = ix>>23;
	if (m == 0) {  /* subnormal x */
		for (i = 0; (ix&0x00800000) == 0; i++)
			ix<<=1;
		m -= i - 1;
	}
	m -= 127;  /* unbias exponent */
	ix = (ix&0x007fffff)|0x00800000;
	if (m&1)  /* odd m, f64 x to make it even */
		ix += ix;
	m >>= 1;  /* m = [m/2] */
	/* generate sqrt(x) bit by bit */
	ix += ix;
	q = s = 0;       /* q = sqrt(x) */
	r = 0x01000000;  /* r = moving bit from right to left */
	while (r != 0) {
		t = s + r;
		if (t <= ix) {
			s = t+r;
			ix -= t;
			q += r;
		}
		ix += ix;
		r >>= 1;
	}
	/* use f32ing add to find out rounding direction */
	if (ix != 0) {
		z = 1.0f - tiny; /* raise inexact flag */
		if (z >= 1.0f) {
			z = 1.0f + tiny;
			if (z > 1.0f)
				q += 2;
			else
				q += q & 1;
		}
	}
	ix = (q>>1) + 0x3f000000;
	ix += m << 23;
	SET_FLOAT_WORD(z, ix);
	return z;
}

f32 f32_floor(f32 x)
{
	union {f32 f; u32 i;} u = {x};
	int e = (int)(u.i >> 23 & 0xff) - 0x7f;
	u32 m;
	if (e >= 23)
		return x;
	if (e >= 0) {
		m = 0x007fffff >> e;
		if ((u.i & m) == 0)
			return x;
		FORCE_EVAL(x + 0x1p120f);
		if (u.i >> 31)
			u.i += m;
		u.i &= ~m;
	} else {
		FORCE_EVAL(x + 0x1p120f);
		if (u.i >> 31 == 0)
			u.i = 0;
		else if (u.i << 1)
			u.f = -1.0;
	}
	return u.f;
}


f32 f32_ceil(f32 x)
{
	union {f32 f; u32 i;} u = {x};
	int e = (int)(u.i >> 23 & 0xff) - 0x7f;
	u32 m;
	if (e >= 23)
		return x;
	if (e >= 0) {
		m = 0x007fffff >> e;
		if ((u.i & m) == 0)
			return x;
		FORCE_EVAL(x + 0x1p120f);
		if (u.i >> 31 == 0)
			u.i += m;
		u.i &= ~m;
	} else {
		FORCE_EVAL(x + 0x1p120f);
		if (u.i >> 31)
			u.f = -0.0;
		else if (u.i << 1)
			u.f = 1.0;
	}
	return u.f;
}


