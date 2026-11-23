"""
브릭라이즈 프로토타입: GLB -> 복셀화 -> 색상 매핑 -> 브릭 배치 -> 개수/원가 산출
사용법: python3 brickify.py input.glb [max_mm=150]
"""
import sys, json, csv
import numpy as np
import trimesh
from scipy import ndimage
from scipy.spatial import cKDTree
from skimage.color import rgb2lab

STUD_MM, BRICK_H_MM = 8.0, 9.6      # 1스터드 가로폭, 브릭 1단 높이
PRICE_PER_PIECE = 68                # 옥스포드 단품 100피스 6,800원
SHELL = 2                           # 내부를 비울 때 남길 외벽 두께(칸)

# 브릭 형태 (가로 x 세로 스터드). 큰 것부터 배치
SHAPES = [(3, 4), (3, 3), (2, 4), (1, 1)]
SHAPES_EXT = [(2, 4), (2, 2), (1, 4), (1, 3), (1, 2), (1, 1)]   # 요고요 판매 브릭 6종
# 요고요 브릭: 100g 3,800원, 100g당 피스 수
PCS_PER_100G = {"1x1": 220, "1x2": 118, "1x3": 80, "1x4": 60, "2x2": 83, "2x4": 44}
UNIT_PRICE = {k: 3800 / v for k, v in PCS_PER_100G.items()}

# 요고요 브릭 14색 (RGB는 상품 사진 기준 추정값, 샘플 실측 후 교체)
PALETTE = {
    "흰색": (242, 240, 230), "검은색": (35, 38, 45), "연회색": (165, 168, 170),
    "진회색": (95, 98, 102), "갈색": (115, 58, 35), "베이지": (232, 210, 160),
    "빨간색": (225, 65, 40), "핑크": (240, 175, 205), "보라색": (110, 70, 190),
    "노란색": (250, 205, 20), "초록색": (30, 135, 55), "연두색": (165, 205, 40),
    "파란색": (25, 100, 215), "밝은 파랑": (35, 160, 230),
}
PNAMES = list(PALETTE)
PRGB = np.array([PALETTE[n] for n in PNAMES], float)
PLAB = rgb2lab((PRGB / 255)[None])[0]
INTERIOR = -1   # 보이지 않는 내부 칸 (아무 색이나 가능)


def load_mesh(path, keep_texture=False):
    s = trimesh.load(path)
    m = s.to_geometry() if hasattr(s, "to_geometry") else s
    if m.visual.kind != "vertex" and not keep_texture:
        m.visual = m.visual.to_color()
    return m


def surface_colors(m, n=1_500_000):
    """겉면 색 표본: 텍스처가 있으면 표면 점을 촘촘히 뽑아 텍스처 색을 읽음"""
    if m.visual.kind == "texture":
        pts, fi = trimesh.sample.sample_surface(m, n)
        bary = trimesh.triangles.points_to_barycentric(m.triangles[fi], pts)
        uv = (m.visual.uv[m.faces[fi]] * bary[:, :, None]).sum(1)
        tex = np.asarray(m.visual.material.baseColorTexture.convert("RGB"))
        h, w = tex.shape[:2]
        col = tex[((1 - uv[:, 1] % 1) * (h - 1)).astype(int), ((uv[:, 0] % 1) * (w - 1)).astype(int)]
        return pts, col.astype(float)
    return m.vertices.copy(), m.visual.vertex_colors[:, :3].astype(float)


def levels(col, target=235):
    p = np.percentile(col.mean(1), 95)
    return np.clip(col * (target / p), 0, 255) if p < target else col


def orient_flat(m):
    """가장 얇은 방향(PCA 최소 분산 축)을 위(Y)로 돌려 눕힘"""
    v = m.vertices - m.vertices.mean(0)
    w, vec = np.linalg.eigh(np.cov(v.T))
    up = vec[:, 0]; a, b = vec[:, 2], np.cross(up, vec[:, 2])
    R = np.stack([a, up, b])          # 새 X, Y(위), Z
    m.vertices = v @ R.T
    return m


def auto_levels(m, target=235):
    """TripoSR은 색을 어둡게 굽는 경향이 있어 밝기를 늘려 보정"""
    c = m.visual.vertex_colors[:, :3].astype(float)
    p = np.percentile(c.mean(1), 95)
    if p < target:
        c = np.clip(c * (target / p), 0, 255)
    vc = m.visual.vertex_colors.copy(); vc[:, :3] = c.astype(np.uint8)
    m.visual.vertex_colors = vc
    return m


def flatten_base(col, min_ratio=0.3, max_cut=2):
    """바닥층 면적이 너무 작으면(가장 넓은 층의 30% 미만) 잘라내 평평하게"""
    area = (col >= -1).sum(axis=(0, 2))
    ys = np.nonzero(area)[0]
    cut = 0
    while cut < max_cut and area[ys[cut]] < min_ratio * area.max():
        cut += 1
    return col[:, ys[cut]:, :], cut


def choose_up_sign(m, max_mm):
    """뒤집었을 때와 비교해 바닥 면적이 더 넓은 쪽을 아래로"""
    best = None
    for sgn in (1, -1):
        mm = m.copy(); mm.vertices[:, 1] *= sgn; mm.vertices[:, 2] *= sgn
        occ = voxelize(mm, max_mm)[0]
        area = occ.sum(axis=(0, 2)); base = area[np.nonzero(area)[0][0]]
        if best is None or base > best[0]: best = (base, mm)
    return best[1]


def voxelize(m, max_mm):
    # 가장 긴 변을 max_mm에 맞춤. Y축 = 높이
    ext = m.extents
    lim = np.array([int(max_mm // STUD_MM), int(max_mm // BRICK_H_MM), int(max_mm // STUD_MM)])
    scale = (max_mm / ext.max())
    while True:   # 최대 크기(칸 수) 안에 들어올 때까지 축소
        v = (m.vertices - m.bounds[0]) * scale          # mm 단위
        # 높이 방향을 스터드 폭 단위와 같은 격자로 만들기 위해 Y를 압축
        v_grid = v.copy(); v_grid[:, 1] *= STUD_MM / BRICK_H_MM
        gm = trimesh.Trimesh(v_grid, m.faces, process=False)
        vox = gm.voxelized(pitch=STUD_MM).fill()
        occ = vox.matrix.astype(bool)                    # (X, Y, Z)
        if (np.array(occ.shape) <= lim).all(): break
        scale *= 0.97
    centers = vox.points                                 # 채워진 칸 중심 좌표
    idx = vox.points_to_indices(centers)
    return occ, centers, idx, v_grid, None, scale


def map_colors(occ, centers, idx, verts, vcols):
    lab_v = rgb2lab((vcols / 255.0)[None])[0]
    # 표본마다 가장 가까운 팔레트 색을 먼저 정하고, 칸마다 다수결 (경계 색이 섞여 탁해지는 것 방지)
    pal_v = np.concatenate([((lab_v[i:i+200000, None] - PLAB[None]) ** 2).sum(-1).argmin(1)
                            for i in range(0, len(lab_v), 200000)])
    tree = cKDTree(verts)
    # 바깥과 맞닿은 칸 = 겉면
    outside = ~ndimage.binary_fill_holes(occ)
    pad = np.pad(outside, 1, constant_values=True)
    surf = np.zeros_like(occ)
    for ax in range(3):
        for d in (-1, 1):
            surf |= np.roll(pad, d, axis=ax)[1:-1, 1:-1, 1:-1]
    surf &= occ
    col = np.full(occ.shape, -2, int)       # -2 = 빈 칸
    col[occ] = INTERIOR
    for c, (i, j, k) in zip(centers, idx):
        if not surf[i, j, k]:
            continue
        nn = tree.query_ball_point(c, r=STUD_MM * 0.75)
        if len(nn) < 3:
            _, nn = tree.query(c, k=12)
        col[i, j, k] = int(np.bincount(pal_v[nn], minlength=len(PLAB)).argmax())
    return col, surf


def smooth_surface(col, surf, iters=1):
    # 얼룩 줄이기: 겉면 칸마다 주변 다수결
    for _ in range(iters):
        new = col.copy()
        for i, j, k in zip(*np.nonzero(surf)):
            sl = col[max(i-1,0):i+2, max(j-1,0):j+2, max(k-1,0):k+2]
            vals = sl[sl >= 0]
            if len(vals):
                b = np.bincount(vals); 
                if b.max() >= 5: new[i, j, k] = b.argmax()
        col = new
    return col


def hollow(col, occ):
    # 겉에서 SHELL칸보다 깊은 내부는 비움 (원가 절감)
    dist = ndimage.distance_transform_cdt(occ, metric="taxicab")
    keep = occ & (dist <= SHELL)
    out = col.copy(); out[~keep] = -2
    return out


def place_bricks(col, shapes=None):
    shapes = shapes or SHAPES
    """층(Y)마다 큰 브릭부터 그리디 배치. 홀수 층은 방향을 바꿔 엇갈림 유도"""
    X, Y, Z = col.shape
    bricks = []
    for y in range(Y):
        layer = col[:, y, :]
        used = np.zeros((X, Z), bool)
        flip = y % 2 == 1
        for w, d in shapes:
            orients = [(w, d), (d, w)] if w != d else [(w, d)]
            if flip: orients = orients[::-1]
            for ow, od in orients:
                for x in range(X - ow + 1):
                    for z in range(Z - od + 1):
                        cell = layer[x:x+ow, z:z+od]
                        if used[x:x+ow, z:z+od].any() or (cell == -2).any():
                            continue
                        real = cell[cell >= 0]
                        if len(real) and (real != real[0]).any():
                            continue       # 보이는 칸 색이 섞이면 불가
                        c = int(real[0]) if len(real) else INTERIOR
                        used[x:x+ow, z:z+od] = True
                        bricks.append(dict(x=x, y=y, z=z, w=ow, d=od, c=c))
    # 내부 전용 브릭은 가장 많이 쓴 색으로 통일
    vis = [b["c"] for b in bricks if b["c"] >= 0]
    fill = int(np.bincount(vis).argmax()) if vis else 0
    for b in bricks:
        if b["c"] == INTERIOR: b["c"] = fill
    return bricks


def connectivity(bricks):
    # 위아래로 겹치는 브릭끼리 연결된 덩어리 수 (1이면 한 몸)
    n = len(bricks); parent = list(range(n))
    def f(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    by_y = {}
    for i, b in enumerate(bricks): by_y.setdefault(b["y"], []).append(i)
    for y, ids in by_y.items():
        for i in ids:
            a = bricks[i]
            for j in by_y.get(y + 1, []):
                b = bricks[j]
                if a["x"] < b["x"]+b["w"] and b["x"] < a["x"]+a["w"] and \
                   a["z"] < b["z"]+b["d"] and b["z"] < a["z"]+a["d"]:
                    parent[f(i)] = f(j)
    roots = {f(i) for i in range(n)}
    return len(roots)


def summarize(bricks):
    cnt = {}
    for b in bricks:
        shape = f"{min(b['w'],b['d'])}x{max(b['w'],b['d'])}"
        key = (shape, PNAMES[b["c"]]); cnt[key] = cnt.get(key, 0) + 1
    return dict(sorted(cnt.items(), key=lambda kv: -kv[1]))


if __name__ == "__main__":
    path = sys.argv[1]; max_mm = float(sys.argv[2]) if len(sys.argv) > 2 else 150
    orient = sys.argv[3] if len(sys.argv) > 3 else "native"
    m = load_mesh(path, keep_texture=True)
    if orient == "auto":     # TripoSR처럼 방향이 불규칙한 모델: 가장 얇은 방향을 위로
        m = choose_up_sign(orient_flat(m), max_mm)
    # native: GLB 표준(Y축이 위)을 그대로 사용 (TRELLIS 등)
    pts, pcol = surface_colors(m); pcol = levels(pcol)
    b0 = m.bounds[0].copy()
    occ, centers, idx, verts, vcols, scale = voxelize(m, max_mm)
    pg = (pts - b0) * scale; pg[:, 1] *= STUD_MM / BRICK_H_MM
    col, surf = map_colors(occ, centers, idx, pg, pcol)
    col = smooth_surface(col, surf)
    col, cut = flatten_base(col)
    occ = occ[:, cut:, :] if cut else occ
    if cut: print(f"바닥 평탄화: 아래 {cut}단 잘라냄")
    results = {}
    runs = [("solid_ext", col, SHAPES_EXT)]
    for mode, grid, shapes in runs:
        bricks = place_bricks(grid, shapes)
        results[mode] = dict(grid=grid, bricks=bricks, summary=summarize(bricks),
                             parts=connectivity(bricks))
    best = "solid_ext"
    json.dump({k: dict(bricks=r["bricks"], shape=list(r["grid"].shape)) for k, r in results.items()},
              open("bricks.json", "w"))
    X, Y, Z = occ.shape
    print(f"크기: 가로 {X}스터드({X*8}mm) x 깊이 {Z}스터드({Z*8}mm) x 높이 {Y}단({Y*9.6:.0f}mm)")
    for mode, r in results.items():
        n = len(r["bricks"])
        cost = sum(UNIT_PRICE[s_] * k for (s_, _), k in r["summary"].items())
        print(f"[{mode}] 총 {n}피스, 원가 {cost:,.0f}원, 연결 덩어리 {r['parts']}개")
    with open("parts_list.csv", "w", newline="", encoding="utf-8-sig") as fh:
        wr = csv.writer(fh); wr.writerow(["형태", "색상", "개수", "피스당 단가(원)", "원가(원)"])
        for (s, c), k in results[best]["summary"].items():
            wr.writerow([s, c, k, round(UNIT_PRICE[s], 1), round(UNIT_PRICE[s] * k)])
    for (s, c), k in results[best]["summary"].items():
        print(f"  {s:4s} {c:6s} {k:4d}")
