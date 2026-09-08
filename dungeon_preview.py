#!/usr/bin/env python3
"""พรีวิวหน้าตาชั้นใต้ดินจาก seed — วิธีใช้:  python python/dungeon_preview.py 1234"""
import random, sys
W, H = 42, 32

def gen(seed):
    rnd = random.Random(seed)
    m = [['#'] * W for _ in range(H)]
    rooms = []
    for _ in range(70):
        w, h = rnd.randint(4, 10), rnd.randint(3, 7)
        x, y = rnd.randint(1, W - w - 2), rnd.randint(1, H - h - 2)
        if any(x < rx + rw + 1 and x + w + 1 > rx and y < ry + rh + 1 and y + h + 1 > ry
               for rx, ry, rw, rh in rooms):
            continue
        for j in range(y, y + h):
            for i in range(x, x + w):
                m[j][i] = '.'
        if rooms:
            px, py = rooms[-1][0] + rooms[-1][2] // 2, rooms[-1][1] + rooms[-1][3] // 2
            cx, cy = x + w // 2, y + h // 2
            i = px
            while i != cx:
                m[py][i] = '.'; i += 1 if cx > px else -1
            j = py
            while j != cy:
                m[j][cx] = '.'; j += 1 if cy > py else -1
        rooms.append((x, y, w, h))
    cx, cy = rooms[-1][0] + rooms[-1][2] // 2, rooms[-1][1] + rooms[-1][3] // 2
    m[cy][cx] = '>'
    return m, rooms

if __name__ == '__main__':
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    m, rooms = gen(seed)
    print(f'seed = {seed}   rooms = {len(rooms)}   ( @ เริ่มต้น · > บันได )')
    print('\n'.join(''.join(r) for r in m))