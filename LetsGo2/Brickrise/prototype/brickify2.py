"""
브릭라이즈 v2: 브릭 + 플레이트 (높이 단위 = 플레이트 1장 3.2mm, 브릭 = 플레이트 3장)
사용법: python3 brickify2.py input.glb [max_mm=200]
출력: parts2.json (부품 목록), parts2.csv, model.glb
"""
import sys, json, csv, math
import numpy as np, trimesh
import brickify as B

PLATE_H = 3.2
B.BRICK_H_MM = PLATE_H            # 격자 높이 단위를 플레이트로
BRICK_SHAPES = [(2, 4), (2, 2), (1, 4), (1, 3), (1, 2), (1, 1)]
PLATE_SHAPES = [(2, 4), (2, 2), (1, 4), (1, 3), (1, 2)]          # 1x1 플레이트 없음
BRICK_PCS = {"1x1": 220, "1x2": 118, "1x3": 80, "1x4": 60, "2x2": 83, "2x4": 44}
PLATE_PCS = {"1x2": 295, "1x3": 200, "1x4": 152, "2x2": 166, "2x4": 85}
PRICE = {("브릭", k): 3800 / v for k, v in BRICK_PCS.items()}
PRICE.update({("플레이트", k): 4500 / v for k, v in PLATE_PCS.items()})
PLATE_COLORS = {B.PNAMES.index(n) for n in
                ["흰색", "검은색", "연회색", "진회색", "갈색", "베이지", "빨간색", "노란색", "파란색", "초록색"]}
EMPTY, ANY = -2, -1


def block_color(col, used, x, y, z, w, d, h, allowed=None):
    """해당 직육면체가 비어있지 않고, 미사용이며, 보이는 색이 하나뿐이면 그 색(내부만이면 ANY) 반환"""
    blk = col[x:x+w, y:y+h, z:z+d]
    if blk.shape != (w, h, d) or (blk == EMPTY).any() or used[x:x+w, y:y+h, z:z+d].any():
        return None
    vis = blk[blk >= 0]
    if len(vis) and (vis != vis[0]).any():
        return None
    c = int(vis[0]) if len(vis) else ANY
    if allowed is not None and c != ANY and c not in allowed:
        return None
    return c


def hollow_grid(col, wall_mm=12.0):
    """겉에서 wall_mm보다 깊은 내부는 비움 (가로 8mm, 높이 3.2mm 비율 반영)"""
    from scipy import ndimage
    solid = col != EMPTY
    dist = ndimage.distance_transform_edt(solid, sampling=(8.0, PLATE_H, 8.0))
    out = col.copy(); out[solid & (dist > wall_mm)] = EMPTY
    return out, int((solid & (dist > wall_mm)).sum())


def place(col):
    """3장 단위 '밴드'로 나눠, 세 장이 모두 같은 색으로 차 있는 칸은 브릭, 나머지는 플레이트"""
    X, Y, Z = col.shape
    Y3 = (Y + 2) // 3 * 3
    if Y3 != Y:
        col = np.concatenate([col, np.full((X, Y3 - Y, Z), EMPTY)], axis=1); Y = Y3
    used = np.zeros(col.shape, bool)
    parts, fixes = [], 0

    def scan2d(cells, y, h, shapes, kind, flip, allowed=None):
        # cells: (X,Z) 색 배열 (EMPTY = 사용 불가)
        for w, d in shapes:
            ors = [(w, d), (d, w)] if w != d else [(w, d)]
            if flip: ors = ors[::-1]
            for ow, od in ors:
                for x in range(X - ow + 1):
                    for z in range(Z - od + 1):
                        blk = cells[x:x+ow, z:z+od]
                        if (blk == EMPTY).any() or used[x:x+ow, y, z:z+od].any(): continue
                        vis = blk[blk >= 0]
                        if len(vis) and (vis != vis[0]).any(): continue
                        c = int(vis[0]) if len(vis) else ANY
                        if allowed is not None and c != ANY and c not in allowed: continue
                        used[x:x+ow, y:y+h, z:z+od] = True
                        parts.append(dict(kind=kind, x=x, y=y, z=z, w=ow, d=od, h=h, c=c))

    for band in range(Y // 3):
        y0 = band * 3; flip = band % 2 == 1
        sub = col[:, y0:y0+3, :]
        full = (sub != EMPTY).sum(1) >= 2      # 3장 중 2장 이상 차 있으면 브릭으로 (빈 1장은 메움)
        vis = np.where(sub >= 0, sub, -9)
        # 세 장의 보이는 색이 하나뿐인지
        same = np.ones((X, Z), bool); bc = np.full((X, Z), ANY)
        for k in range(3):
            v = vis[:, k, :]; has = v >= 0
            conflict = has & (bc >= 0) & (bc != v)
            same &= ~conflict; bc = np.where(has & (bc < 0), v, bc)
        bcells = np.where(full & same, bc, EMPTY)
        scan2d(bcells, y0, 3, BRICK_SHAPES, "브릭", flip)
        for k in range(3):   # 브릭이 차지한 칸은 격자에도 반영
            col[:, y0+k, :] = np.where(used[:, y0+k, :] & (col[:, y0+k, :] == EMPTY), ANY, col[:, y0+k, :])
        for k in range(3):
            y = y0 + k
            pc = np.where(~used[:, y, :], col[:, y, :], EMPTY)
            scan2d(pc, y, 1, PLATE_SHAPES, "플레이트", (k % 2 == 1) ^ flip, PLATE_COLORS)
            # 1x1 플레이트가 없으므로 남은 한 칸은 옆 빈칸과 합쳐 1x2 플레이트로, 안 되면 비움
            for x, z in zip(*np.nonzero((col[:, y, :] != EMPTY) & ~used[:, y, :])):
                c = int(col[x, y, z]); done = False
                for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, nz = x + dx, z + dz
                    if 0 <= nx < X and 0 <= nz < Z and col[nx, y, nz] == EMPTY and not used[nx, y, nz]:
                        used[x, y, z] = used[nx, y, nz] = True
                        parts.append(dict(kind="플레이트", x=int(min(x, nx)), y=y, z=int(min(z, nz)),
                                          w=1 + abs(dx), d=1 + abs(dz), h=1, c=c)); done = True; break
                if not done: used[x, y, z] = True
                fixes += 1
    vis = [p["c"] for p in parts if p["c"] >= 0]
    fill = int(np.bincount(vis).argmax())
    for p in parts:
        if p["c"] == ANY: p["c"] = fill
        if p["kind"] == "플레이트" and p["c"] not in PLATE_COLORS: p["c"] = fill
    return parts, fixes


def components(parts):
    n = len(parts); par = list(range(n))
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    by_bottom = {}
    for i, p in enumerate(parts): by_bottom.setdefault(p["y"], []).append(i)
    for i, a in enumerate(parts):
        for j in by_bottom.get(a["y"] + a["h"], []):
            b = parts[j]
            if a["x"] < b["x"]+b["w"] and b["x"] < a["x"]+a["w"] and a["z"] < b["z"]+b["d"] and b["z"] < a["z"]+a["d"]:
                par[f(i)] = f(j)
    return [f(i) for i in range(n)]


def drop_fragments(parts, min_size=10):
    """본체와 연결되지 않는 작은 조각(가장자리 부스러기)은 제거"""
    roots = components(parts)
    from collections import Counter
    cnt = Counter(roots); main = cnt.most_common(1)[0][0]
    keep = [p for p, r in zip(parts, roots) if r == main or cnt[r] >= min_size]
    return keep, len(parts) - len(keep)


def connectivity(parts):
    n = len(parts); par = list(range(n))
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    by_bottom = {}
    for i, p in enumerate(parts): by_bottom.setdefault(p["y"], []).append(i)
    for i, a in enumerate(parts):
        for j in by_bottom.get(a["y"] + a["h"], []):
            b = parts[j]
            if a["x"] < b["x"]+b["w"] and b["x"] < a["x"]+a["w"] and a["z"] < b["z"]+b["d"] and b["z"] < a["z"]+a["d"]:
                par[f(i)] = f(j)
    return len({f(i) for i in range(n)})


def export_glb(parts, path):
    meshes = []
    gap = 0.15
    for p in parts:
        rgb = list(B.PRGB[p["c"]].astype(np.uint8)) + [255]
        sx, sz, sy = p["w"] * 8, p["d"] * 8, p["h"] * PLATE_H
        box = trimesh.creation.box(extents=[sx - gap, sy - gap, sz - gap])
        box.apply_translation([p["x"] * 8 + sx / 2, p["y"] * PLATE_H + sy / 2, p["z"] * 8 + sz / 2])
        box.visual.vertex_colors = rgb; meshes.append(box)
        for i in range(p["w"]):
            for k in range(p["d"]):
                st = trimesh.creation.cylinder(radius=2.4, height=1.7, sections=12)
                st.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
                st.apply_translation([p["x"] * 8 + i * 8 + 4, (p["y"] + p["h"]) * PLATE_H + 0.85, p["z"] * 8 + k * 8 + 4])
                st.visual.vertex_colors = rgb; meshes.append(st)
    trimesh.util.concatenate(meshes).export(path)


if __name__ == "__main__":
    path = sys.argv[1]; max_mm = float(sys.argv[2]) if len(sys.argv) > 2 else 200
    m = B.load_mesh(path, keep_texture=True)
    pts, pcol = B.surface_colors(m); pcol = B.levels(pcol)
    b0 = m.bounds[0].copy()
    occ, centers, idx, _, _, scale = B.voxelize(m, max_mm)
    pg = (pts - b0) * scale; pg[:, 1] *= B.STUD_MM / PLATE_H
    col, surf = B.map_colors(occ, centers, idx, pg, pcol)
    col = B.smooth_surface(col, surf)
    col, cut = B.flatten_base(col, max_cut=3)
    mode = sys.argv[3] if len(sys.argv) > 3 else "solid"
    if mode == "hollow":
        col, removed = hollow_grid(col)
        print(f"내부 비우기: {removed}칸 제거 (외벽 두께 약 12mm)")
    parts, fixes = place(col)
    parts, dropped = drop_fragments(parts)
    print(f"본체와 떨어진 작은 조각 {dropped}피스 제거")
    X, Y, Z = col.shape
    print(f"크기: {X*8}mm x {Z*8}mm x 높이 {Y*PLATE_H:.0f}mm (플레이트 {Y}장 높이), 바닥 {cut}장 잘라냄, 한 칸 보정 {fixes}곳")
    cnt = {}
    for p in parts:
        k = (p["kind"], f"{min(p['w'],p['d'])}x{max(p['w'],p['d'])}", B.PNAMES[p["c"]])
        cnt[k] = cnt.get(k, 0) + 1
    cost = sum(PRICE[(k[0], k[1])] * n for k, n in cnt.items())
    print(f"총 {len(parts)}피스 (브릭 {sum(1 for p in parts if p['kind']=='브릭')}, 플레이트 {sum(1 for p in parts if p['kind']=='플레이트')}), "
          f"원가 {cost:,.0f}원, 연결 덩어리 {connectivity(parts)}개")
    json.dump(dict(parts=parts, shape=[X, Y, Z]), open("parts2.json", "w"), ensure_ascii=False)
    with open("parts2.csv", "w", newline="", encoding="utf-8-sig") as fh:
        wr = csv.writer(fh); wr.writerow(["종류", "형태", "색상", "개수", "여분", "피스당 단가(원)", "원가(원, 여분 포함)"])
        for k, n in sorted(cnt.items(), key=lambda kv: (kv[0][0], -kv[1])):
            sp = max(1, math.ceil(n * 0.03)); u = PRICE[(k[0], k[1])]
            wr.writerow([k[0], k[1], k[2], n, sp, round(u, 1), round(u * (n + sp))])
    export_glb(parts, "model.glb")
