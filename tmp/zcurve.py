#
# x     y
# 010   110
#
# i  yx yx yx
#    10 11 00
#
#
# x y         yx
#
# 0 0     0   00
# 1 0     1   01
# 0 1     2   10
# 1 1     3   11
#
#  2    3
#
#  0    1
#

def zcurve(x,y):
    xx = x
    yy = y
    level = 0
    result = 0
    while xx > 0 or yy > 0:
        x_bit = 1 if (xx & 1) else 0
        y_bit = 1 if (yy & 1) else 0
        result += (x_bit + (y_bit << 1)) << (2*level)
        xx = xx >> 1
        yy = yy >> 1
        level += 1
    return result

def zcurve_inv(i):
    ii = i
    x = 0
    y = 0
    level = 0
    while ii > 0:
        x_bit = 1 if (ii & 1) else 0
        y_bit = 1 if (ii & 2) else 0
        x += x_bit << level
        y += y_bit << level
        level += 1
        ii = ii >> 2
    return (x,y)

print("%5s %5s ----> %5s ----> %5s %5s\n" % ("x","y","z","xx","yy"))
for y in range(4):
    for x in range(4):
        z = zcurve(x,y)
        xx,yy = zcurve_inv(z)
        print("%5d %5d ----> %5d ----> %5d %5d" % (x, y, z, xx, yy))








