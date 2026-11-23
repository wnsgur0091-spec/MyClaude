"""1x1 큐브 블럭(8x8x7mm, 옆면 결합) 버전: 칸 하나 = 블럭 하나"""
import sys, json, csv, math, numpy as np, trimesh
import brickify as B
from scipy import ndimage
from skimage.color import rgb2lab
H=7.0; B.BRICK_H_MM=H
# 색상 전 종류 보유 가정: 확장 팔레트 (실제 색상표 받으면 교체)
from pal39 import PAL39, SPECIAL
PAL={n:c for no,n,c in PAL39 if no not in SPECIAL}
B.PALETTE=PAL; B.PNAMES=list(PAL); B.PRGB=np.array([PAL[n] for n in B.PNAMES],float); B.PLAB=rgb2lab((B.PRGB/255)[None])[0]
F=sys.argv[1]; MAX=float(sys.argv[2]); PRICE=2100/1000
m=B.load_mesh(F,keep_texture=True); pts,pcol=B.surface_colors(m); pcol=B.levels(pcol); b0=m.bounds[0].copy()
occ,centers,idx,_,_,scale=B.voxelize(m,MAX)
pg=(pts-b0)*scale; pg[:,1]*=B.STUD_MM/H
col,surf=B.map_colors(occ,centers,idx,pg,pcol)
col,cut=B.flatten_base(col,max_cut=2)
filled=col!=-2
# 옆면으로도 결합되므로 면이 맞닿은 칸끼리 한 덩어리 -> 떨어진 조각만 제거
lab,n=ndimage.label(filled); sizes=np.bincount(lab.ravel()); sizes[0]=0; keep=lab==sizes.argmax()
dropped=int(filled.sum()-keep.sum()); col[~keep]=-2; filled=keep
vis=col[col>=0]; fillc=int(np.bincount(vis).argmax()); col[(col==-1)]=fillc   # 안 보이는 내부 칸
X,Y,Z=col.shape; N=int(filled.sum())
print(f"크기 {X*8}x{Z*8}x{Y*H:.0f}mm ({X}x{Z}칸, {Y}단), 바닥 {cut}단 잘라냄, 떨어진 조각 {dropped}개 제거, 총 {N}개")
cnt={}
for c in col[filled]: cnt[B.PNAMES[c]]=cnt.get(B.PNAMES[c],0)+1
with open("cube_parts.csv","w",newline="",encoding="utf-8-sig") as fh:
    w=csv.writer(fh); w.writerow(["색상","개수","여분","원가(원, 여분 포함)"])
    for k,v in sorted(cnt.items(),key=lambda kv:-kv[1]):
        sp=max(2,math.ceil(v*0.05)); w.writerow([k,v,sp,round((v+sp)*PRICE)])
# GLB: 큐브 + 윗면 돌기
meshes=[]
for x,y,z in zip(*np.nonzero(filled)):
    rgb=list(B.PRGB[col[x,y,z]].astype(np.uint8))+[255]
    bx=trimesh.creation.box(extents=[7.8,H-0.2,7.8]); bx.apply_translation([x*8+4,y*H+H/2,z*8+4]); bx.visual.vertex_colors=rgb; meshes.append(bx)
    if not (y+1<Y and filled[x,y+1,z]):
        st=trimesh.creation.cylinder(radius=2.4,height=1.5,sections=12)
        st.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0])); st.apply_translation([x*8+4,(y+1)*H+0.75,z*8+4])
        st.visual.vertex_colors=rgb; meshes.append(st)
trimesh.util.concatenate(meshes).export("cube_model.glb")
np.save("grid.npy",np.where(filled,col,-1))
json.dump(dict(parts=[{"kind":"큐브"}]*N,shape=[X,Y,Z]),open("cube_parts.json","w"))
