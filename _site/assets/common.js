const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const f1 = (v, d = 1) => (+v).toFixed(d);
function svgEl(tag, attrs, parent, text){
  const e = document.createElementNS(NS, tag);
  for (const a in attrs) e.setAttribute(a, attrs[a]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function segGroup(id, cb){
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    setSeg(id, b.dataset.v); cb(b.dataset.v);
  });
}
function setSeg(id, v){ $(id).querySelectorAll('button[data-v]').forEach(o => o.setAttribute('aria-pressed', o.dataset.v === String(v))); }

/* ---------- conductor colours (TIA-568 colour code) ---------- */
const PAIRS = [ // screen angle (0 = right, 90 = down)
  {a:225, c:'#2d6bd8', zh:'藍', n:1},
  {a:315, c:'#f08a24', zh:'橙', n:2},
  {a:135, c:'#2fa155', zh:'綠', n:3},
  {a:45,  c:'#8a5a33', zh:'棕', n:4},
];
const WHITE = '#f2f2f2';

/* Cable cross-section as an SVG string (viewBox -100..100).
   overall: 'U' | 'F' | 'S' | 'SF'   pair: 'U' | 'F'
   Same geometry as the PowerPoint deck. Every visible part carries class "ly" + data-layer for click-to-explain. */
function cableSVG(o = {}){
  o = Object.assign({jacket:'#3f79b5', overall:'U', pair:'U', spline:false, drain:false, rip:false, label:''}, o);
  const R = 92, d = R * 0.47, r = R * 0.17, n = v => v.toFixed(2);
  const out = [];
  out.push(`<g class="ly" data-layer="jacket"><circle r="${R}" fill="${o.jacket}"/></g>`);
  out.push(`<circle r="${n(R * 0.88)}" fill="var(--core-bg)"/>`);
  const sw = R * 0.03;
  if (o.overall === 'S' || o.overall === 'SF')
    out.push(`<g class="ly" data-layer="braid"><circle r="${n(R * 0.845)}" fill="none" stroke="var(--braid)" stroke-width="${n(sw * 1.5)}" stroke-dasharray="${n(R * .07)} ${n(R * .045)}"/></g>`);
  if (o.overall === 'F')
    out.push(`<g class="ly" data-layer="foil"><circle r="${n(R * 0.84)}" fill="none" stroke="var(--foil)" stroke-width="${n(sw)}"/></g>`);
  if (o.overall === 'SF')
    out.push(`<g class="ly" data-layer="foil"><circle r="${n(R * 0.785)}" fill="none" stroke="var(--foil)" stroke-width="${n(sw)}"/></g>`);
  if (o.spline){
    const L = R * 0.72, W = R * 0.06;
    out.push(`<g class="ly" data-layer="spline" fill="#b8c2c8"><rect x="${n(-L)}" y="${n(-W / 2)}" width="${n(2 * L)}" height="${n(W)}"/><rect x="${n(-W / 2)}" y="${n(-L)}" width="${n(W)}" height="${n(2 * L)}"/></g>`);
  }
  PAIRS.forEach(p => {
    const t = p.a * Math.PI / 180, px = d * Math.cos(t), py = d * Math.sin(t), tx = -Math.sin(t), ty = Math.cos(t);
    if (o.pair === 'F')
      out.push(`<g class="ly" data-layer="pairfoil"><ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(2 * r + R * .045)}" ry="${n(r + R * .045)}" transform="rotate(${p.a + 90} ${n(px)} ${n(py)})" fill="none" stroke="var(--foil)" stroke-width="${n(sw)}"/></g>`);
    [[1, false], [-1, true]].forEach(([k, stripe]) => {
      const cx = px + k * tx * r, cy = py + k * ty * r;
      out.push(`<g class="ly" data-layer="insul" data-pair="${p.n}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(stripe ? r - R * .025 : r)}" fill="${stripe ? WHITE : p.c}"${stripe ? ` stroke="${p.c}" stroke-width="${n(R * .05)}"` : ''}/></g>`);
      out.push(`<g class="ly" data-layer="copper"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * .45)}" fill="var(--cu)"/></g>`);
    });
  });
  if (o.drain) out.push(`<g class="ly" data-layer="drain"><circle cx="${n(R * .72)}" cy="0" r="${n(R * .05)}" fill="#b7bec2"/></g>`);
  if (o.rip) out.push(`<g class="ly" data-layer="rip"><circle cx="0" cy="${n(-R * .79)}" r="${n(R * .045)}" fill="#ede3c8"/></g>`);
  return `<svg viewBox="-100 -100 200 200" role="img" aria-label="${o.label || '網路線剖面圖'}">${out.join('')}</svg>`;
}
const LAYER_INFO = {
  jacket:  ['外被 Jacket', '保護內部線對。室內常用 PVC 或 LSZH（低煙無鹵），戶外用抗 UV 的黑色 PE。外被顏色沒有標準規定。'],
  rip:     ['撕裂繩 Rip cord', '拉它可以把外被撕開。實務上多直接剪掉，改用剝線刀。'],
  spline:  ['十字骨架 Spline', '把 4 對線分隔開、固定相對位置，降低線對間串音。Cat 6 常見，但不是每條都有。'],
  insul:   ['芯線絕緣層 Insulation', '多為 PE（聚乙烯），比外被硬、介電特性穩定。每對一條實色、一條白底帶色條。'],
  copper:  ['銅導體 Conductor', '水平佈線為單股實心裸銅，跳線為多股絞合銅。CCA（銅包鋁）不符 TIA／ISO 規範，電阻大、PoE 易發熱。'],
  foil:    ['鋁箔遮蔽 Foil (F)', '包住全部線對的鋁箔層，擋高頻電場干擾。通常搭配一條裸銅地線，端接時要接到金屬模組外殼。'],
  braid:   ['編織網遮蔽 Braid (S)', '常見為鍍錫銅編織網，對低頻磁場與高頻都有效，也兼作接地導通路徑。線會比較粗、比較硬。'],
  pairfoil:['線對鋁箔 Pair foil', '每一對各自包一層鋁箔（ISO 代碼斜線後的 F，俗稱「個隔」），線對之間的串音最低。'],
  drain:   ['地線 Drain wire', '與鋁箔接觸的裸銅線，讓鋁箔遮蔽能可靠地連到接頭外殼與接地。'],
};
/* wire click-to-explain on an svg container */
function layerPicker(box, info, btnBox){
  const svg = box.querySelector('svg');
  const keys = [...new Set([...svg.querySelectorAll('.ly')].map(g => g.dataset.layer))];
  function pick(k){
    svg.classList.toggle('dim', !!k);
    svg.querySelectorAll('.ly').forEach(g => g.classList.toggle('sel', g.dataset.layer === k));
    if (btnBox) btnBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    const t = LAYER_INFO[k];
    info.innerHTML = t ? `<h3>${t[0]}</h3><p>${t[1]}</p>` : '<h3>點剖面圖的任一層</h3><p>或按下方按鈕，看每一層的用途。</p>';
    abbrify(null, '#' + info.id);
  }
  svg.addEventListener('click', e => { const g = e.target.closest('.ly'); pick(g ? g.dataset.layer : null); });
  if (btnBox){
    btnBox.innerHTML = keys.map(k => `<button type="button" data-k="${k}">${LAYER_INFO[k][0].split(' ')[0]}</button>`).join('') + '<button type="button" data-k="">全部</button>';
    btnBox.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b.dataset.k || null); });
  }
  pick(null);
}
/* twisted-pair side view: returns path d strings for the two conductors */
function twistPaths(x0, y0, w, amp, cycles){
  const N = Math.round(cycles * 36), mk = ph => {
    let s = '';
    for (let i = 0; i <= N; i++){ const u = i / N; s += (i ? 'L' : 'M') + (x0 + u * w).toFixed(1) + ' ' + (y0 + amp * Math.sin(2 * Math.PI * cycles * u + ph)).toFixed(1); }
    return s;
  };
  return [mk(Math.PI), mk(0)];
}
function twistSVG(svg, x0, y0, w, amp, cycles, color){
  const [a, b] = twistPaths(x0, y0, w, amp, cycles);
  svgEl('path', {d:a, fill:'none', stroke:WHITE, 'stroke-width':5, 'stroke-linecap':'round'}, svg);
  svgEl('path', {d:b, fill:'none', stroke:color, 'stroke-width':5, 'stroke-linecap':'round'}, svg);
}

/* multiple-choice quiz: items = [{q, opts:[...], a:index, why}] */
function quiz(box, items){
  items.forEach((it, qi) => {
    const d = document.createElement('div'); d.className = 'q';
    d.innerHTML = `<p>Q${qi + 1}. ${it.q}</p><div class="opts"></div><p class="fb" hidden></p>`;
    const opts = d.querySelector('.opts'), fb = d.querySelector('.fb');
    it.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = o;
      b.addEventListener('click', () => {
        opts.querySelectorAll('button').forEach(x => x.classList.remove('right', 'wrong'));
        b.classList.add(i === it.a ? 'right' : 'wrong');
        fb.hidden = false; fb.innerHTML = (i === it.a ? '✓ 正確。' : '✗ 再想想。') + ' ' + it.why;
      });
      opts.appendChild(b);
    });
    box.appendChild(d);
  });
}

/* abbreviation glossary: [abbr, full English name, 中文說明] */
const ABBR = [
  ['UTP', 'Unshielded Twisted Pair', '無遮蔽雙絞線'],
  ['STP', 'Shielded Twisted Pair', '遮蔽雙絞線（舊稱，各廠定義不一）'],
  ['FTP', 'Foiled Twisted Pair', '鋁箔遮蔽雙絞線（舊稱，多指 F/UTP）'],
  ['ScTP', 'Screened Twisted Pair', '整體遮蔽雙絞線（舊稱，等同 F/UTP）'],
  ['PiMF', 'Pairs in Metal Foil', '每對鋁箔（舊稱，多指 S/FTP）'],
  ['LSZH', 'Low Smoke Zero Halogen', '低煙無鹵'],
  ['LSOH', 'Low Smoke Zero Halogen', '低煙無鹵（另一種寫法）'],
  ['PVC', 'Polyvinyl Chloride', '聚氯乙烯'],
  ['PE', 'Polyethylene', '聚乙烯'],
  ['HDPE', 'High-Density Polyethylene', '高密度聚乙烯'],
  ['AWG', 'American Wire Gauge', '美國線規，數字越大線越細'],
  ['CCA', 'Copper-Clad Aluminum', '銅包鋁（不符 TIA／ISO 規範）'],
  ['NEXT', 'Near-End Crosstalk', '近端串音'],
  ['FEXT', 'Far-End Crosstalk', '遠端串音'],
  ['PSNEXT', 'Power Sum Near-End Crosstalk', '綜合近端串音（其他三對對一對的總和）'],
  ['ACR-F', 'Attenuation to Crosstalk Ratio, Far-End', '遠端衰減串音比'],
  ['AXT', 'Alien Crosstalk', '外部串音（相鄰線纜之間）'],
  ['RL', 'Return Loss', '回波損耗：阻抗不連續造成的反射，數值越大越好'],
  ['IL', 'Insertion Loss', '插入損耗（衰減）'],
  ['PoE', 'Power over Ethernet', '乙太網路供電'],
  ['PSE', 'Power Sourcing Equipment', '供電端設備（如 PoE 交換器）'],
  ['PD', 'Powered Device', '受電端設備（如 AP、IP Cam）'],
  ['TIA', 'Telecommunications Industry Association', '美國電信工業協會'],
  ['ANSI', 'American National Standards Institute', '美國國家標準協會'],
  ['ISO', 'International Organization for Standardization', '國際標準化組織'],
  ['IEC', 'International Electrotechnical Commission', '國際電工委員會'],
  ['IEEE', 'Institute of Electrical and Electronics Engineers', '電機電子工程師學會（乙太網路標準 802.3 的制定者）'],
  ['TSB', 'Telecommunications Systems Bulletin', 'TIA 技術公告'],
  ['NEC', 'National Electrical Code (NFPA 70)', '美國國家電氣法規'],
  ['CPR', 'Construction Products Regulation', '歐盟建築產品法規（線纜防火分級）'],
  ['CMP', 'Communications Plenum cable', '通訊線—風管（Plenum）級，防火最高'],
  ['CMR', 'Communications Riser cable', '通訊線—豎井（Riser）級'],
  ['CMG', 'Communications General-purpose cable', '通訊線—一般用途級'],
  ['CMX', 'Communications cable, residential/limited use', '通訊線—住宅／限制用途級'],
  ['MDI', 'Medium Dependent Interface', '設備端 RJ45 介面腳位定義'],
  ['MDIX', 'Medium Dependent Interface Crossover', '交叉腳位；Auto-MDIX 會自動判斷'],
  ['MMF', 'Multimode Fiber', '多模光纖'],
  ['SMF', 'Single-mode Fiber', '單模光纖'],
  ['EMB', 'Effective Modal Bandwidth', '有效模態頻寬（多模光纖頻寬指標，MHz·km）'],
  ['VCSEL', 'Vertical-Cavity Surface-Emitting Laser', '垂直共振腔面射型雷射（多模用，便宜）'],
  ['DFB', 'Distributed Feedback laser', '分佈回饋式雷射（單模、長距）'],
  ['FP', 'Fabry–Pérot laser', '法布里–珀羅雷射（單模、中距）'],
  ['SFP', 'Small Form-factor Pluggable', '小型可插拔模組（1G 世代）'],
  ['SFP+', 'Enhanced Small Form-factor Pluggable', '增強型 SFP（10G）'],
  ['SFP28', 'Small Form-factor Pluggable 28', '25G 單通道模組'],
  ['QSFP', 'Quad Small Form-factor Pluggable', '四通道可插拔模組'],
  ['MSA', 'Multi-Source Agreement', '多廠商協議：規範模組外形與介面'],
  ['DAC', 'Direct Attach Copper', '直連銅纜（兩端模組＋銅線一體）'],
  ['AOC', 'Active Optical Cable', '主動光纜（兩端光電轉換＋光纖一體）'],
  ['DDM', 'Digital Diagnostic Monitoring', '數位診斷監控：讀取模組溫度、電壓、偏壓、收發光功率'],
  ['DOM', 'Digital Optical Monitoring', '數位光學監控（同 DDM）'],
  ['BiDi', 'Bidirectional', '單芯雙向：一條光纖用兩個波長收發'],
  ['WDM', 'Wavelength Division Multiplexing', '分波多工'],
  ['SWDM', 'Short Wavelength Division Multiplexing', '短波分波多工（OM5 的用途）'],
  ['LC', 'Lucent Connector', 'LC 接頭：1.25 mm 陶瓷插芯，SFP 標配'],
  ['SC', 'Subscriber Connector', 'SC 接頭：2.5 mm 插芯，推拉式'],
  ['FC', 'Ferrule Connector', 'FC 接頭：2.5 mm 插芯，螺牙鎖固'],
  ['MPO', 'Multi-fiber Push-On', '多芯推入式接頭（12／24 芯）'],
  ['MTP', 'MTP (US Conec brand of MPO)', 'US Conec 的 MPO 品牌'],
  ['UPC', 'Ultra Physical Contact', '超物理接觸研磨（藍色）'],
  ['APC', 'Angled Physical Contact', '8° 斜角研磨（綠色）'],
  ['EMI', 'Electromagnetic Interference', '電磁干擾'],
  ['PHY', 'Physical layer device', '實體層晶片'],
  ['AP', 'Access Point', '無線基地台'],
  ['IPA', 'Isopropyl Alcohol', '異丙醇（光纖清潔用）'],
  ['dBm', 'decibel-milliwatts', '以 1 mW 為基準的功率單位，0 dBm = 1 mW'],
  ['NRZ', 'Non-Return-to-Zero', '不歸零二階調變：每個符號 1 bit'],
  ['PAM4', '4-level Pulse Amplitude Modulation', '四階脈衝振幅調變：每個符號 2 bit'],
  ['SerDes', 'Serializer/Deserializer', '串列器／解串器，晶片的高速電通道'],
  ['AUI', 'Attachment Unit Interface', '晶片到模組的電介面（如 400GAUI-8）'],
  ['CAUI-4', '100 Gb/s Attachment Unit Interface, 4 lanes', '100G 電介面，4×25G NRZ'],
  ['FEC', 'Forward Error Correction', '前向錯誤更正'],
  ['DSP', 'Digital Signal Processor', '數位訊號處理器（光模組內做時脈還原、等化、FEC）'],
  ['LPO', 'Linear Pluggable Optics', '線性可插拔光模組：拿掉模組內 DSP'],
  ['LRO', 'Linear Receive Optics', '線性接收光模組：只有發射端保留 DSP'],
  ['CPO', 'Co-Packaged Optics', '共封裝光學：光引擎和交換晶片封裝在一起'],
  ['DML', 'Directly Modulated Laser', '直接調變雷射'],
  ['EML', 'Electro-absorption Modulated Laser', '電吸收調變雷射'],
  ['SiPh', 'Silicon Photonics', '矽光子'],
  ['CW', 'Continuous Wave', '連續光（不調變的雷射光源）'],
  ['OIF', 'Optical Internetworking Forum', '光互聯論壇（制定 400ZR、800ZR、CEI 電介面）'],
  ['CWDM', 'Coarse Wavelength Division Multiplexing', '粗分波多工（波長間隔 20 nm）'],
  ['LWDM', 'LAN Wavelength Division Multiplexing', 'LAN 分波多工（1310 nm 附近、間隔約 4.5 nm）'],
  ['DWDM', 'Dense Wavelength Division Multiplexing', '密集分波多工（長途、相干光用）'],
  ['PSM4', 'Parallel Single Mode 4-lane', '4 通道平行單模（MSA，8 芯）'],
  ['QSFP-DD', 'Quad Small Form-factor Pluggable Double Density', '雙密度 QSFP：8 通道，相容 QSFP 籠座'],
  ['OSFP', 'Octal Small Form-factor Pluggable', '8 通道可插拔模組，體積較大、散熱較好'],
  ['OSFP-XD', 'OSFP Extra Dense', '16 通道 OSFP'],
  ['QSFP28', 'Quad Small Form-factor Pluggable 28', '100G 四通道模組（4×25G）'],
  ['QSFP56', 'Quad Small Form-factor Pluggable 56', '200G 四通道模組（4×50G PAM4）'],
  ['QSFP112', 'Quad Small Form-factor Pluggable 112', '400G 四通道模組（4×100G PAM4）'],
  ['SFP56', 'Small Form-factor Pluggable 56', '50G 單通道模組'],
  ['ACC', 'Active Copper Cable', '主動銅纜（內含類比 redriver）'],
  ['AEC', 'Active Electrical Cable', '主動電纜（內含 retimer／DSP）'],
  ['DP-16QAM', 'Dual-Polarization 16-ary Quadrature Amplitude Modulation', '雙偏振 16QAM：相干光的調變方式'],
  ['ZR', 'ZR (coherent reach ≈ 80 km+)', '相干光長距規格，如 OIF 400ZR'],
];
function abbrify(tableBox, selectors = '.panel, .lede, footer'){
  const found = new Set();
  const keys = ABBR.map(a => a[0]).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?<![A-Za-z_])(' + keys.map(esc).join('|') + ')(?![A-Za-z_+0-9])', 'g');
  const full = Object.fromEntries(ABBR.map(a => [a[0], a]));
  document.querySelectorAll(selectors).forEach(root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n =>
      n.parentElement.closest('abbr, script, style, svg, button, output, label, select, h2, h3, .noabbr, #abbrTable') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const t = n.nodeValue; re.lastIndex = 0; if (!re.test(t)) return;
      re.lastIndex = 0; const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = re.exec(t))){
        frag.appendChild(document.createTextNode(t.slice(last, m.index)));
        const a = document.createElement('abbr'); a.title = full[m[1]][1] + '｜' + full[m[1]][2]; a.textContent = m[1];
        frag.appendChild(a); found.add(m[1]); last = m.index + m[1].length;
      }
      frag.appendChild(document.createTextNode(t.slice(last))); n.replaceWith(frag);
    });
  });
  if (tableBox) tableBox.innerHTML = '<table class="tbl"><thead><tr><th>縮寫 Abbr.</th><th>完整英文名稱 Full name</th><th>中文說明</th></tr></thead><tbody>' +
    ABBR.filter(a => tableBox.dataset.all || found.has(a[0])).map(a => `<tr><td class="m">${a[0]}</td><td>${a[1]}</td><td>${a[2]}</td></tr>`).join('') + '</tbody></table>';
}
