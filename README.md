# 網路線材系列（Network Cabling Series）

銅纜與光纖的互動參考網站：首頁選型決策器＋9 頁（構造與雙絞、Cat 等級、遮蔽代碼、線徑外被線序、佈線與驗收、光纖基礎、光模組、接頭與維護、選型總表與辭典）。

- `_site/`：Vercel 部署的靜態網站（rootDirectory）
- `_src/`：產生器。`shell.html` 共用版型，`series.css`＋`base2.css`（沿用 DC-DC／PoE／VRM 系列樣式）＋`cable.css`，`common.js` 放剖面圖產生器 `cableSVG()`、測驗與縮寫辭典，各頁內容是 `*.part.html`
- 更新流程：修改 `_src/` → `python _src/build.py` → commit 並 push（main 自動部署）

內容依據 ISO/IEC 11801-1、ANSI/TIA-568.2-D／568.3-D、IEEE 802.3、TIA-598；銅纜部分參考弱電通 × 越祥光電影片並經查證修正。
