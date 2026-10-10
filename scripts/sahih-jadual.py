"""
SAHKAN BACAAN JADUAL TERHADAP GARISAN PETAK SEBENAR PDF.

Penghurai portal (src/lib/jadual-huraian.ts) membaca TEKS dan mengira petak
daripada kedudukannya. Skrip ini membaca GARISAN yang dilukis dalam PDF dan
menentukan petak daripadanya - kaedah yang bebas sepenuhnya - kemudian
membandingkan kedua-duanya waktu demi waktu: subjek, subjek seiring, guru.

GUNA SETIAP KALI jadual baharu tiba dengan rupa yang belum pernah dilihat,
SEBELUM ia dimuat naik. Kiraan "48/50 slot" bukan bukti: jadual Tahap 2
(16.8.2026) melaporkan nombor itu sedangkan 353 daripada 1,296 waktu salah.

    pip install pymupdf
    npm run sahih:jadual -- "/laluan/TAHUN 4 16.8.pdf"

Keluar 0 = sepadan. Beza yang HANYA melibatkan nama dipatah baris
("NURULHUD A" lawan "NURULHUDA") dan kod kelas ("6 EFK*") dijangka dan
tidak dikira: skrip ini tidak mencantum nama, penghurai mencantumnya.
"""
import fitz, json, sys, re
KOD={"PER":"PERHIMPUNAN","PMZ":"PMZ","BI":"BI","MT":"MM","PSV":"PSV","PAI":"PAI","BA":"AR","TASMIK":"TASMIK","SN":"SAINS","BM":"BM","RBT":"RBT","PK":"PJPK","PJ":"PJPK","SEJ":"SEJ","BC":"BC","P. MORAL":"PM"}
HARI={"Mo":"isnin","Tu":"selasa","We":"rabu","Th":"khamis","Fr":"jumaat"}
def kod(t):
    u=re.sub(r"\s*\(?[QJU]\)$","",t.strip())
    if u.startswith("P.ISLAM") or u.startswith("PAI"): return "PAI"
    if u.startswith("MORAL") or u.startswith("P. MORAL"): return "PM"
    return KOD.get(t,"?"+t)
def muka(page):
    V=[];H=[]
    for d in page.get_drawings():
        for it in d["items"]:
            if it[0]=="l":
                a,b=it[1],it[2]
                if abs(a.x-b.x)<0.5: V.append((a.x,min(a.y,b.y),max(a.y,b.y)))
                elif abs(a.y-b.y)<0.5: H.append((a.y,min(a.x,b.x),max(a.x,b.x)))
            elif it[0]=="re":
                r=it[1]
                if r.width<1.5: V.append((r.x0,r.y0,r.y1))
                elif r.height<1.5: H.append((r.y0,r.x0,r.x1))
                else:
                    V+= [(r.x0,r.y0,r.y1),(r.x1,r.y0,r.y1)]; H+=[(r.y0,r.x0,r.x1),(r.y1,r.x0,r.x1)]
    sp=[]
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines",[]):
            for s in l["spans"]:
                if s["text"].strip(): sp.append(s)
    masa=sorted([s for s in sp if re.match(r"\d+:\d+ - \d+:\d+",s["text"])],key=lambda s:s["bbox"][0])
    cx=[(s["bbox"][0]+s["bbox"][2])/2 for s in masa]
    hari=[(HARI[s["text"].strip()],s) for s in sp if s["text"].strip() in HARI]
    ymasa=max(s["bbox"][3] for s in masa)
    def sel(x,y):
        l=max([v[0] for v in V if v[0]<x and v[1]-1<=y<=v[2]+1],default=None)
        r=min([v[0] for v in V if v[0]>x and v[1]-1<=y<=v[2]+1],default=None)
        t=max([h[0] for h in H if h[0]<y and h[1]-1<=x<=h[2]+1]+[q for q in sempadan if q<y],default=None)
        b=min([h[0] for h in H if h[0]>y and h[1]-1<=x<=h[2]+1]+[q for q in sempadan if q>y],default=None)
        if l is None: l=X0-70
        if r is None: r=X1+70
        return (l,t,r,b)
    # baris hari daripada sel label
    out={}
    bold=[s for s in sp if s["font"].endswith("F2") and s["origin"][1]>ymasa]
    ital=[s for s in sp if s["font"].endswith("F3")]
    X0=min(v[0] for v in V); X1=max(v[0] for v in V); Y0=ymasa+2; Y1=max(v[2] for v in V)
    V+=[(X0-70,Y0,Y1),(X1+0.01,Y0,Y1)] if X1<760 else [(X0-70,Y0,Y1)]
    import collections
    pj=collections.defaultdict(float)
    for y,a,b in H: pj[round(y)]+=b-a
    sempadan=sorted([y for y,t in pj.items() if t>0.5*(X1-X0) and y>Y0+5]+[Y0])
    if Y1-sempadan[-1]>40: sempadan.append(Y1)
    fonts=set(s["font"] for s in sp)
    cells={}
    for s in bold:
        x=(s["bbox"][0]+s["bbox"][2])/2; y=s["origin"][1]-4
        c=sel(x,y); cells.setdefault(c,{"sub":[], "guru":[]})["sub"].append(s)
    for s in ital:
        x=s["bbox"][2]-2; y=s["origin"][1]-3
        c=sel(x,y)
        if c in cells: cells[c]["guru"].append(s)
        else: cells.setdefault(c,{"sub":[], "guru":[]})["guru"].append(s)
    res={h:[None]*len(cx) for h in HARI.values()}
    bar={}
    for nama,s in hari:
        y=s["origin"][1]-8; bar[nama]=(max(q for q in sempadan if q<y), min(q for q in sempadan if q>y))
    yatim=[]
    for c,v in cells.items():
        if not v["sub"]:
            yatim.append([g["text"] for g in v["guru"]]); continue
        l,t,r,b=c
        subs=sorted(v["sub"],key=lambda s:(s["origin"][1],s["bbox"][0]))
        teks="".join(s["text"].strip() for s in subs)
        gs=sorted(v["guru"],key=lambda s:(round(s["origin"][1]),s["bbox"][0]))
        guru=" ".join(g["text"].strip() for g in gs)
        ym=(t+b)/2
        for nama,(bt,bb) in bar.items():
            if bt-1<=ym<=bb+1:
                atas = (b-t) < (bb-bt)*0.7 and ym < (bt+bb)/2
                bawah = (b-t) < (bb-bt)*0.7 and ym > (bt+bb)/2
                for i,x in enumerate(cx):
                    if l<x<r:
                        e=res[nama][i] or ["","","",""]
                        if bawah: e[2]=kod(teks); e[3]=guru
                        else: e[0]=kod(teks); e[1]=guru
                        res[nama][i]=e
    return res,yatim,fonts

def tampal(g):
    return re.sub(r"\b([A-Z']{4,}) ([A-Z]{1,2})\b", r"\1\2", g)
def kunci(g):
    g = "" if re.search(r"[\d*]", g) else g
    return "".join(sorted(re.sub(r"[^A-Z.' ]", " ", tampal(g.upper())).split()))

if __name__ == "__main__":
    import subprocess, os
    pdfp = sys.argv[1]
    sini = os.path.dirname(os.path.abspath(__file__))
    js = json.loads(subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings", os.path.join(sini, "sahih-jadual.mts"), pdfp],
        capture_output=True, text=True, check=True).stdout)
    doc = fitz.open(pdfp); beza = kira = 0
    for n, page in enumerate(doc):
        if n >= len(js["muka"]): break
        m = js["muka"][n]
        for a in m["amaran"]: print(f"AMARAN muka {n+1} {m['kelas']}: {a}")
        if not m["kelas"]: continue
        res, yatim, _ = muka(page)
        for h in res:
            for i, (a, b) in enumerate(zip(res[h], m["hari"][h])):
                if a is None and b is None: continue
                kira += 1
                if a is None or b is None or a[0] != b[0] or a[2] != b[2] or kunci(a[1]) != kunci(b[1]) or kunci(a[3]) != kunci(b[3]):
                    beza += 1; print(f"BEZA muka {n+1} {m['kelas']} {h} waktu {i+1}: PDF={a}  PORTAL={b}")
    print(f"{os.path.basename(pdfp)}: {kira} waktu dibanding, {beza} beza")
    sys.exit(1 if beza else 0)
