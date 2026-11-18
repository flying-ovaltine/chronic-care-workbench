/**
 * 慢病健康管理专家团 —— Web 半边（左侧边栏入口 + 三栏照护面板）。
 *
 * 面板负责：健康档案（带 A/B/C 可信度）、用药时间轴（医嘱 / 患者自调分开）、
 * 自包含 SVG 趋势图（用药事件画竖线，自调药红色虚线）、三段结论、四级就医建议、
 * 急诊红线中断、妊娠闸门。
 *
 * 医学判断不在这里：面板把事实包复制成提示词，交给 chronic-care-team 技能。
 * 自包含：只 require("react")，不联网、不引 CDN、不用外部图标。
 */
(function () {
  function makeFactory() {
    return (require) => {
      const module = { exports: {} };
      const React = require('react');
      const h = React.createElement;
      const { useState, useEffect, useMemo, useRef, useCallback } = React;

      const PLUGIN_ID = 'chronic-care-workbench';
      const STORE_KEY = 'dsh.chronic-care-workbench.v1';
      const LANG_KEY = 'dsh.chronic-care-workbench.lang';

      /* ───────────────────────── 文案 ───────────────────────── */
      const DICT = {
        zh: {
          panel: '慢病管理',
          title: '慢病健康管理专家团',
          subtitle: '先看症状，再看数字。录入 → 看趋势 → 复制简报给对话。',
          mustLine: '必须在医师指导下调整治疗方案',
          mustNote: '任何加量、减量、停药、换药或注射剂量调整，都要先联系经治医师。',
          copy: '复制健康简报',
          copied: '已复制，粘到对话里发送',
          copyFail: '复制失败，请手动全选复制',
          reset: '清空',
          resetConfirm: '清空本次录入的全部数据？',
          profile: '健康档案',
          meds: '用药记录',
          report: '报告',
          sex: '性别', male: '男', female: '女', age: '年龄',
          symptoms: '症状（有不适就写在这里）',
          kind: '项目', value: '数值', value2: '舒张压', unit: '单位', date: '测量日期',
          condition: '测量条件', grade: '可信度',
          addIndicator: '加一条指标', addMed: '加一条用药',
          medName: '药名 / 针剂', dose: '剂量', start: '开始', end: '结束', decidedBy: '谁决定',
          byDoctor: '医嘱', bySelf: '自己调的',
          selfTitle: '你自己调整过的用药',
          selfNote: '只记录时间和内容。请尽快联系医师，本面板不评判对错、不建议新剂量。',
          trend: '趋势',
          noData: '还没有数据',
          advice: '三段结论（粘贴对话给出的结论，或自己写）',
          adviceHealth: '健康建议', adviceDiet: '饮食指导', adviceCare: '就医建议',
          careLevel: '四级就医建议',
          green: '居家', yellow: '门诊随访', orange: '尽快专科', red: '立即急诊',
          redFlag: '红线预警',
          redFlagHit: '命中：',
          redNow: '现在做什么',
          redWhere: '立即就医 / 拨 120',
          redCollapsed: '其余内容已收起。',
          copyRed: '复制红线请求',
          gateTitle: '先确认一件事',
          gateQ: '是否怀孕，或近半年打算怀孕？',
          gateYes: '是', gateNo: '否', gateUnsure: '不确定 / 不想说',
          gateOnTitle: '按「可能妊娠」处理：用药建议已暂停',
          gateOnBody: '建档、趋势、饮食照常；用药判读与调整建议先停下。请带这份清单找医师核对，并转产科 + 开药专科共管。',
          gateList: '请医师核对清单',
          gateAgain: '改答案',
          terms: '术语先说人话',
          disclaimer: '本面板不做诊断、不开处方。这是分析与路径，不替代面诊。',
          copyBrief: '请按技能 chronic-care-team 的规则回答（若能看到该技能，请先加载它）。',
          kindNames: {
            sbp: '收缩压', dbp: '舒张压', glucose: '血糖', weight: '体重', waist: '腰围',
            height: '身高', bmi: 'BMI', uric: '尿酸', egfr: 'eGFR',
          },
          flags: {
            stroke: '突发剧烈头痛 / 一侧无力',
            cardiac: '胸痛胸闷超过 10 分钟',
            breath: '喘不上气 / 粉红泡沫痰',
            hypo: '意识不清的低血糖',
            dka: '恶心呕吐 + 呼吸深快 + 嗜睡',
            aki: '尿量骤减伴水肿',
          },
          gateDrugs: ['ACEI/ARB（普利类 / 沙坦类）', '他汀类', '司美格鲁肽等 GLP-1', 'SGLT2i（列净类）', '降尿酸药', '抗凝药'],
          glossary: [
            ['收缩压', '量血压时上面那个数'],
            ['eGFR', '算出来的肾功能分数'],
            ['尿酸', '血里的一种代谢废物，高了容易痛风'],
            ['SGLT2i', '一类让糖从尿里排走的降糖药（列净类）'],
          ],
        },
        en: {
          panel: 'Chronic Care',
          title: 'Chronic Care Team',
          subtitle: 'Symptoms first, numbers second. Enter data → read the trend → copy the brief.',
          mustLine: 'Treatment adjustments must be made under a physician\u2019s guidance',
          mustNote: 'Any increase, reduction, discontinuation, switch or injection-dose change requires contacting the treating physician first.',
          copy: 'Copy health brief',
          copied: 'Copied — paste it into the chat',
          copyFail: 'Copy failed; select and copy manually',
          reset: 'Clear',
          resetConfirm: 'Clear all data entered this session?',
          profile: 'Health profile',
          meds: 'Medications',
          report: 'Report',
          sex: 'Sex', male: 'Male', female: 'Female', age: 'Age',
          symptoms: 'Symptoms (write anything you feel)',
          kind: 'Indicator', value: 'Value', value2: 'Diastolic', unit: 'Unit', date: 'Date',
          condition: 'Measuring condition', grade: 'Reliability',
          addIndicator: 'Add indicator', addMed: 'Add medication',
          medName: 'Drug / injection', dose: 'Dose', start: 'Start', end: 'Stop', decidedBy: 'Decided by',
          byDoctor: 'Doctor', bySelf: 'Self-adjusted',
          selfTitle: 'Medications you adjusted yourself',
          selfNote: 'Time and content are recorded only. Contact your physician soon; this panel does not judge and does not suggest a new dose.',
          trend: 'Trend',
          noData: 'No data yet',
          advice: 'Three conclusions (paste what the chat returns, or write your own)',
          adviceHealth: 'Health advice', adviceDiet: 'Diet guidance', adviceCare: 'Care-seeking advice',
          careLevel: 'Care level',
          green: 'Stay home', yellow: 'Clinic follow-up', orange: 'Specialist soon', red: 'Emergency now',
          redFlag: 'Red-flag alert',
          redFlagHit: 'Matched: ',
          redNow: 'What to do now',
          redWhere: 'Seek emergency care / call 120',
          redCollapsed: 'Everything else is collapsed.',
          copyRed: 'Copy red-flag request',
          gateTitle: 'One thing first',
          gateQ: 'Are you pregnant, or planning pregnancy in the next six months?',
          gateYes: 'Yes', gateNo: 'No', gateUnsure: 'Not sure / prefer not to say',
          gateOnTitle: 'Treated as "possibly pregnant": medication advice suspended',
          gateOnBody: 'Profile, trends and diet stay available; medication interpretation and adjustment advice pause here. Take this checklist to a physician, and involve obstetrics plus the prescribing specialist.',
          gateList: 'Checklist for the physician',
          gateAgain: 'Change answer',
          terms: 'Plain language first',
          disclaimer: 'This panel makes no diagnosis and issues no prescription. It is an analysis and a path, not a substitute for a visit.',
          copyBrief: 'Answer under the rules of the skill chronic-care-team (load it first if you can see it).',
          kindNames: {
            sbp: 'Systolic', dbp: 'Diastolic', glucose: 'Glucose', weight: 'Weight', waist: 'Waist',
            height: 'Height', bmi: 'BMI', uric: 'Uric acid', egfr: 'eGFR',
          },
          flags: {
            stroke: 'Sudden severe headache / one-sided weakness',
            cardiac: 'Chest pain over 10 minutes',
            breath: 'Breathlessness / pink frothy sputum',
            hypo: 'Unconscious hypoglycemia',
            dka: 'Nausea/vomiting with deep rapid breathing',
            aki: 'Sharply reduced urine with edema',
          },
          gateDrugs: ['ACEI/ARB', 'Statins', 'Semaglutide / GLP-1', 'SGLT2i', 'Urate-lowering drugs', 'Anticoagulants'],
          glossary: [
            ['Systolic', 'the top number when blood pressure is measured'],
            ['eGFR', 'a calculated kidney function score'],
            ['Uric acid', 'a waste product in blood; high levels favour gout'],
            ['SGLT2i', 'a class of glucose-lowering drugs that pass sugar out in urine'],
          ],
        },
      };

      let currentLang = 'zh';

      /* ───────────────────────── 红线 ───────────────────────── */
      const RED_FLAGS = [
        { id: 'stroke', zh: ['剧烈头痛', '一侧无力', '嘴歪', '说话不清', '偏瘫'], en: ['severe headache', 'one-sided weakness', 'slurred speech'] },
        { id: 'cardiac', zh: ['胸痛', '胸闷', '压榨', '胸口发紧'], en: ['chest pain', 'chest tightness'] },
        { id: 'breath', zh: ['喘不上气', '呼吸困难', '粉红泡沫', '憋气'], en: ['breathless', 'pink frothy', 'cannot breathe'] },
        { id: 'hypo', zh: ['低血糖', '出冷汗', '意识不清', '手抖心慌'], en: ['hypoglycemia', 'cold sweat', 'confused'] },
        { id: 'dka', zh: ['恶心呕吐', '呼吸深快', '嗜睡', '烂苹果'], en: ['vomiting', 'deep rapid breathing', 'drowsy'] },
        { id: 'aki', zh: ['尿量骤减', '尿少', '水肿', '腿肿'], en: ['reduced urine', 'edema', 'swollen legs'] },
      ];

      function detectFlags(text) {
        const s = String(text || '').toLowerCase();
        if (!s.trim()) return [];
        return RED_FLAGS.filter((f) => f.zh.some((k) => s.includes(k.toLowerCase())) || f.en.some((k) => s.includes(k.toLowerCase()))).map((f) => f.id);
      }

      /* ───────────────────────── 指标与图表 ───────────────────────── */
      const KINDS = ['sbp', 'dbp', 'glucose', 'weight', 'waist', 'height', 'bmi', 'uric', 'egfr'];
      const UNITS = { sbp: 'mmHg', dbp: 'mmHg', glucose: 'mmol/L', weight: 'kg', waist: 'cm', height: 'cm', bmi: 'kg/m²', uric: 'μmol/L', egfr: 'mL/min/1.73m²' };
      const BANDS = {
        sbp: [90, 140], dbp: [60, 90], glucose: [3.9, 7.8], weight: null, waist: null,
        height: null, bmi: [18.5, 24], uric: [0, 420], egfr: [90, 120],
      };

      let seq = 0;
      const uid = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

      function emptyState() {
        return {
          sex: '', age: '', pregnancy: 'unknown', symptoms: '',
          indicators: [], meds: [], careLevel: '',
          advice: { health: '', diet: '', care: '' },
        };
      }

      function readStore() {
        try {
          const raw = window.localStorage.getItem(STORE_KEY);
          if (!raw) return emptyState();
          const parsed = JSON.parse(raw);
          return Object.assign(emptyState(), parsed, {
            indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
            meds: Array.isArray(parsed.meds) ? parsed.meds : [],
            advice: Object.assign({ health: '', diet: '', care: '' }, parsed.advice || {}),
          });
        } catch {
          return emptyState();
        }
      }

      function writeStore(state) {
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* 忽略 */ }
      }

      /** 妊娠闸门：skip（男性）/ ask（需先问）/ on（按可能妊娠处理）。 */
      function gateOf(state) {
        if (state.sex === 'male') return 'skip';
        const age = Number(state.age);
        const inRange = !Number.isFinite(age) || age === 0 || (age >= 12 && age <= 55);
        if (!inRange) return 'skip';
        if (state.pregnancy === 'no') return 'skip';
        if (state.pregnancy === 'yes') return 'on';
        return 'ask';
      }

      /* ───────────────────────── 样式 ───────────────────────── */
      const CSS = `
.cw{--cw-bg:var(--dsw-alias-bg-layer-1,#fff);--cw-soft:var(--dsw-alias-bg-layer-2,#f5f8f7);--cw-text:var(--dsw-alias-label-primary,#16201c);--cw-muted:var(--dsw-alias-label-secondary,#63736c);--cw-border:var(--dsw-alias-border-l3,#e3eae6);--cw-accent:#26785f;--cw-danger:#b42318;color:var(--cw-text);font:14px/1.65 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);height:100%;overflow:auto;padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 24px 40px max(24px,var(--dsh-frame-leading-clearance,0px));box-sizing:border-box}
.cw *{box-sizing:border-box}
.cw h1{font-size:22px;margin:0;font-weight:650;line-height:1.3}
.cw h2{font-size:15px;margin:0 0 10px;font-weight:600}
.cw p{margin:0}
.cw-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
.cw-sub{color:var(--cw-muted);font-size:12.5px;margin-top:6px}
.cw-actions{display:flex;gap:8px;flex-wrap:wrap}
.cw button{font:inherit;cursor:pointer;border:1px solid var(--cw-border);background:var(--cw-bg);color:inherit;border-radius:8px;padding:7px 11px;min-height:34px}
.cw button:hover{background:var(--cw-soft)}
.cw-primary{background:var(--cw-accent)!important;border-color:var(--cw-accent)!important;color:#fff!important}
.cw-ghost{border-color:transparent!important;background:transparent!important}
.cw-danger{color:var(--cw-danger)!important;border-color:#f0c2bd!important}
.cw-must{border:2px solid var(--cw-accent);background:#eef8f3;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.cw-must strong{display:block;font-size:17px;line-height:1.35;margin-bottom:4px}
.cw-must span{font-size:12.5px;color:#2c5a4b}
.cw-red{border:2px solid var(--cw-danger);background:#fff5f4;border-radius:12px;padding:16px;margin-bottom:14px}
.cw-red h2{color:var(--cw-danger);font-size:16px}
.cw-red-three{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:10px 0}
.cw-red-three>div{border:1px dashed #e3a39c;border-radius:8px;padding:9px 11px;background:#fff}
.cw-red-three b{display:block;font-size:12px;color:var(--cw-danger);margin-bottom:2px}
.cw-red-three span{font-size:12.5px;color:var(--cw-muted)}
.cw-gate{border:2px solid #d9b45a;background:#fffbef;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.cw-gate h2{color:#8a5a00;font-size:15px}
.cw-cols{display:grid;gap:12px;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1.25fr);align-items:start}
@media (max-width:1180px){.cw-cols{grid-template-columns:1fr 1fr}.cw-col-report{grid-column:1/-1}}
@media (max-width:820px){.cw-cols{grid-template-columns:1fr}.cw{padding:16px 14px 32px}}
.cw-card{background:var(--cw-bg);border:1px solid var(--cw-border);border-radius:12px;padding:14px}
.cw-row{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));align-items:end;border-bottom:1px dashed var(--cw-border);padding-bottom:8px;margin-bottom:8px}
.cw-row:last-child{border-bottom:0}
.cw-field{display:grid;gap:3px;min-width:0}
.cw-field>span{font-size:11px;color:var(--cw-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cw input,.cw select,.cw textarea{font:inherit;color:inherit;width:100%;background:var(--cw-bg);border:1px solid var(--cw-border);border-radius:7px;padding:6px 8px;min-width:0;font-size:13px}
.cw textarea{resize:vertical;min-height:56px}
.cw :focus-visible{outline:2px solid var(--cw-accent);outline-offset:2px}
.cw-chart{border:1px solid var(--cw-border);border-radius:10px;padding:8px;margin-bottom:10px}
.cw-chart>header{display:flex;justify-content:space-between;font-size:12px;color:var(--cw-muted);margin-bottom:4px}
.cw-self{border:1px solid #f0c2bd;background:#fff6f5;border-radius:10px;padding:10px 12px;margin:10px 0}
.cw-self h3{font-size:13px;margin:0 0 6px;color:var(--cw-danger)}
.cw-self li{font-size:12.5px}
.cw-care{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 4px}
.cw-care>button[data-on=true]{color:#fff}
.cw-g{background:#1f8a4c!important;border-color:#1f8a4c!important}
.cw-y{background:#b98900!important;border-color:#b98900!important}
.cw-o{background:#c2610b!important;border-color:#c2610b!important}
.cw-r{background:#b42318!important;border-color:#b42318!important}
.cw-gloss{font-size:12px;color:var(--cw-muted);line-height:1.7}
.cw-fixed{position:sticky;bottom:0;margin-top:14px;background:#eef8f3;border:1px solid #bfe0d1;border-radius:10px;padding:9px 12px;font-size:12.5px;color:#215844}
.cw-note{color:var(--cw-muted);font-size:12px}
`;
      let cssInstalled = false;
      function ensureCss() {
        if (cssInstalled || typeof document === 'undefined') return;
        cssInstalled = true;
        const style = document.createElement('style');
        style.setAttribute('data-plugin', PLUGIN_ID);
        style.textContent = CSS;
        document.head.appendChild(style);
      }

      const t = (key) => DICT[currentLang][key];
      const tv = (group, key) => DICT[currentLang][group][key];

      /* ───────────────────────── 图表 ───────────────────────── */
      function pointsOf(indicators, kind) {
        return indicators
          .filter((row) => row.kind === kind && String(row.value).trim() !== '' && Number.isFinite(Number(row.value)))
          .slice()
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .map((row) => ({ v: Number(row.value), date: String(row.date || ''), grade: row.grade || 'C' }));
      }

      function Chart({ kind, points, meds }) {
        const band = BANDS[kind];
        const values = points.map((p) => p.v);
        if (values.length === 0) {
          return h('div', { className: 'cw-chart' },
            h('header', null, h('b', null, tv('kindNames', kind)), h('span', null, t('noData'))));
        }
        const lows = values.concat(band ? [band[0]] : []);
        const highs = values.concat(band ? [band[1]] : []);
        let lo = Math.min.apply(null, lows);
        let hi = Math.max.apply(null, highs);
        if (hi === lo) { hi = lo + 1; lo = lo - 1; }
        const W = 560;
        const H = 132;
        const PAD = 26;
        const n = points.length;
        const x = (i) => (n === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1));
        const y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2);
        const parts = [];
        if (band) {
          parts.push(h('rect', {
            key: 'band',
            x: PAD, y: Math.min(y(band[1]), y(band[0])), width: W - PAD * 2,
            height: Math.abs(y(band[1]) - y(band[0])),
            fill: '#26785f', opacity: 0.1,
          }));
        }
        // 用药事件竖线
        meds.forEach((med, mi) => {
          const medDate = String(med.start || '');
          if (!medDate || n === 0) return;
          let nearest = 0;
          let best = Infinity;
          points.forEach((p, pi) => {
            const dist = Math.abs(new Date(p.date || 0).getTime() - new Date(medDate).getTime());
            if (Number.isFinite(dist) && dist < best) { best = dist; nearest = pi; }
          });
          parts.push(h('line', {
            key: `m${mi}`,
            x1: x(nearest), x2: x(nearest), y1: PAD - 8, y2: H - PAD,
            stroke: med.bySelf ? '#b42318' : '#98a8a1',
            strokeWidth: med.bySelf ? 1.6 : 1,
            strokeDasharray: med.bySelf ? '4 3' : undefined,
          }));
        });
        // 折线
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
        parts.push(h('path', { key: 'line', d, fill: 'none', stroke: '#26785f', strokeWidth: 2, strokeLinejoin: 'round' }));
        points.forEach((p, i) => {
          parts.push(h('circle', { key: `p${i}`, cx: x(i), cy: y(p.v), r: 3, fill: p.grade === 'C' ? '#9fb3ab' : '#26785f' }));
        });
        return h('div', { className: 'cw-chart' },
          h('header', null,
            h('b', null, tv('kindNames', kind)),
            h('span', null, band ? `目标 ${band[0]}–${band[1]} ${UNITS[kind]}` : UNITS[kind])),
          h('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: 132, role: 'img', 'aria-label': tv('kindNames', kind) }, parts));
      }

      /* ───────────────────────── 简报 ───────────────────────── */
      function buildBrief(state, flags, gate) {
        const L = DICT[currentLang];
        const lines = [L.copyBrief, ''];
        if (flags.length > 0) {
          lines.push(`【红线命中】${flags.map((f) => L.flags[f]).join(' / ')}`);
          lines.push('要求：停下其它分析，只给两件事 —— 现在做什么 / 立即就医或拨 120。');
          lines.push('');
        }
        lines.push('【人口学】');
        lines.push(`性别：${state.sex === 'male' ? L.male : state.sex === 'female' ? L.female : '（未填）'}；年龄：${state.age || '（未填）'}；妊娠状态：${state.pregnancy === 'yes' ? L.gateYes : state.pregnancy === 'no' ? L.gateNo : 'unknown'}`);
        lines.push(`闸门状态：${gate === 'on' ? '开启（按可能妊娠处理）' : gate === 'ask' ? '未问' : '关闭'}`);
        lines.push('');
        lines.push('【指标】（项目 | 数值 | 单位 | 条件 | 日期 | 可信度）');
        if (state.indicators.length === 0) lines.push('（未填）');
        for (const row of state.indicators) {
          const name = DICT[currentLang].kindNames[row.kind] || row.kind;
          const v2 = row.kind === 'sbp' && row.value2 ? `/${row.value2}` : '';
          lines.push(`- ${name}: ${row.value || '—'}${v2} ${row.unit || UNITS[row.kind] || ''} | ${row.condition || '—'} | ${row.date || '—'} | ${row.grade || 'C'} 级`);
        }
        lines.push('');
        lines.push('【用药】（药名 | 剂量 | 起止 | 医嘱或自调）');
        if (state.meds.length === 0) lines.push('（未填）');
        for (const med of state.meds) {
          lines.push(`- ${med.name || '—'} | ${med.dose || '—'} | ${med.start || '—'} → ${med.end || '—'} | ${med.bySelf ? '患者自调' : '医嘱'}`);
        }
        lines.push('');
        lines.push(`【症状】${state.symptoms || '（无记录）'}`);
        lines.push('');
        const selfMeds = state.meds.filter((m) => m.bySelf);
        if (selfMeds.length > 0) {
          lines.push('【患者自行调整过的用药】（只记录与提示联系医师，不评判、不建议剂量）');
          for (const med of selfMeds) lines.push(`- ${med.start || '—'} ${med.name || '—'} ${med.dose || ''}`);
          lines.push('');
        }
        lines.push('【面板已选四级就医建议】' + (state.careLevel ? L[state.careLevel] : '（未选）'));
        lines.push('');
        lines.push('请按 skill 的输出纪律给出三段结论：健康建议 / 饮食指导 / 就医建议，并写清四级就医建议的触发依据与时限；数值写死并带适用人群；术语先说人话；结尾加一句「这个数要不要紧，把记录带给医师看最稳妥，别自己照着图判断或改药」，并注明「必须在医师指导下调整治疗方案」。');
        return lines.join('\n');
      }

      function copyText(text, onDone, onFail) {
        const done = () => onDone();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => fallback());
            return;
          }
        } catch { /* 落到兜底 */ }
        fallback();
        function fallback() {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done();
          } catch {
            onFail();
          }
        }
      }

      /* ───────────────────────── 小组件 ───────────────────────── */
      function F(props) {
        return h('label', { className: 'cw-field' },
          h('span', null, props.label),
          h('input', {
            value: props.value,
            placeholder: props.placeholder || '',
            inputMode: props.numeric ? 'decimal' : undefined,
            onChange: (e) => props.onChange(e.target.value),
          }));
      }

      function Indicators({ rows, setRows }) {
        const update = (id, patch) => setRows(rows.map((r) => (r.id === id ? Object.assign({}, r, patch) : r)));
        const children = rows.map((r) => h('div', { className: 'cw-row', key: r.id },
          h('label', { className: 'cw-field' }, h('span', null, t('kind')),
            h('select', { value: r.kind, onChange: (e) => update(r.id, { kind: e.target.value, unit: UNITS[e.target.value] || '' }) },
              KINDS.map((k) => h('option', { key: k, value: k }, tv('kindNames', k))))),
          h(F, { label: t('value'), value: r.value, numeric: true, onChange: (v) => update(r.id, { value: v }) }),
          r.kind === 'sbp' ? h(F, { label: t('value2'), value: r.value2 || '', numeric: true, onChange: (v) => update(r.id, { value2: v }) }) : null,
          h(F, { label: t('unit'), value: r.unit || '', onChange: (v) => update(r.id, { unit: v }) }),
          h(F, { label: t('date'), value: r.date || '', onChange: (v) => update(r.id, { date: v }) }),
          h(F, { label: t('condition'), value: r.condition || '', onChange: (v) => update(r.id, { condition: v }) }),
          h('label', { className: 'cw-field' }, h('span', null, t('grade')),
            h('select', { value: r.grade || 'C', onChange: (e) => update(r.id, { grade: e.target.value }) },
              ['A', 'B', 'C'].map((g) => h('option', { key: g, value: g }, g)))),
          h('button', { className: 'cw-ghost cw-danger', onClick: () => setRows(rows.filter((x) => x.id !== r.id)) }, '✕')));
        return h('div', { className: 'cw-card' },
          h('h2', null, t('profile')),
          children,
          h('button', {
            onClick: () => setRows(rows.concat([{ id: uid(), kind: 'sbp', value: '', value2: '', unit: 'mmHg', date: '', condition: '', grade: 'A' }])),
          }, '+ ' + t('addIndicator')));
      }

      function Meds({ rows, setRows }) {
        const update = (id, patch) => setRows(rows.map((r) => (r.id === id ? Object.assign({}, r, patch) : r)));
        const children = rows.map((r) => h('div', { className: 'cw-row', key: r.id },
          h('label', { className: 'cw-field', style: { gridColumn: 'span 2' } }, h('span', null, t('medName')),
            h('input', { value: r.name || '', onChange: (e) => update(r.id, { name: e.target.value }) })),
          h(F, { label: t('dose'), value: r.dose || '', onChange: (v) => update(r.id, { dose: v }) }),
          h(F, { label: t('start'), value: r.start || '', onChange: (v) => update(r.id, { start: v }) }),
          h(F, { label: t('end'), value: r.end || '', onChange: (v) => update(r.id, { end: v }) }),
          h('label', { className: 'cw-field' }, h('span', null, t('decidedBy')),
            h('select', { value: r.bySelf ? 'self' : 'doctor', onChange: (e) => update(r.id, { bySelf: e.target.value === 'self' }) },
              h('option', { value: 'doctor' }, t('byDoctor')),
              h('option', { value: 'self' }, t('bySelf')))),
          h('button', { className: 'cw-ghost cw-danger', onClick: () => setRows(rows.filter((x) => x.id !== r.id)) }, '✕')));
        return h('div', { className: 'cw-card' },
          h('h2', null, t('meds')),
          children,
          h('button', {
            onClick: () => setRows(rows.concat([{ id: uid(), name: '', dose: '', start: '', end: '', bySelf: false }])),
          }, '+ ' + t('addMed')));
      }

      function Report({ state, setState, meds }) {
        const kinds = KINDS.filter((k) => state.indicators.some((row) => row.kind === k));
        const charts = kinds.map((k) => h(Chart, { key: k, kind: k, points: pointsOf(state.indicators, k), meds }));
        const selfMeds = meds.filter((m) => m.bySelf);
        const levels = ['green', 'yellow', 'orange', 'red'];
        const cls = { green: 'cw-g', yellow: 'cw-y', orange: 'cw-o', red: 'cw-r' };
        const setAdvice = (key, v) => setState({ advice: Object.assign({}, state.advice, { [key]: v }) });
        return h('div', { className: 'cw-card cw-col-report' },
          h('h2', null, t('report')),
          h('div', { className: 'cw-must', style: { marginBottom: 12 } },
            h('strong', null, t('mustLine')),
            h('span', null, t('mustNote'))),
          charts.length === 0 ? h('p', { className: 'cw-note' }, t('noData')) : charts,
          selfMeds.length > 0
            ? h('div', { className: 'cw-self' },
              h('h3', null, t('selfTitle')),
              h('ul', null, selfMeds.map((m) => h('li', { key: m.id }, `${m.start || '—'} · ${m.name || '—'} ${m.dose || ''}`))),
              h('p', { className: 'cw-note' }, t('selfNote')))
            : null,
          h('h3', { style: { fontSize: 13, margin: '12px 0 6px' } }, t('careLevel')),
          h('div', { className: 'cw-care' },
            levels.map((lv) => h('button', {
              key: lv,
              'data-on': state.careLevel === lv ? 'true' : 'false',
              className: state.careLevel === lv ? cls[lv] : '',
              onClick: () => setState({ careLevel: state.careLevel === lv ? '' : lv }),
            }, t(lv)))),
          h('h3', { style: { fontSize: 13, margin: '12px 0 6px' } }, t('advice')),
          h('label', { className: 'cw-field', style: { marginBottom: 8 } }, h('span', null, t('adviceHealth')),
            h('textarea', { rows: 3, value: state.advice.health, onChange: (e) => setAdvice('health', e.target.value) })),
          h('label', { className: 'cw-field', style: { marginBottom: 8 } }, h('span', null, t('adviceDiet')),
            h('textarea', { rows: 3, value: state.advice.diet, onChange: (e) => setAdvice('diet', e.target.value) })),
          h('label', { className: 'cw-field' }, h('span', null, t('adviceCare')),
            h('textarea', { rows: 3, value: state.advice.care, onChange: (e) => setAdvice('care', e.target.value) })));
      }

      /* ───────────────────────── 主面板 ───────────────────────── */
      function Workbench() {
        ensureCss();
        const [state, setRaw] = useState(readStore);
        const [lang, setLang] = useState(() => {
          try {
            const saved = window.localStorage.getItem(LANG_KEY);
            if (saved === 'zh' || saved === 'en') return saved;
          } catch { /* 忽略 */ }
          const nav = (navigator.language || 'zh').toLowerCase();
          return nav.startsWith('zh') ? 'zh' : nav.startsWith('en') ? 'en' : 'zh';
        });
        const [toast, setToast] = useState('');
        const timer = useRef(0);

        currentLang = lang;

        useEffect(() => { try { window.localStorage.setItem(LANG_KEY, lang); } catch { /* 忽略 */ } }, [lang]);
        useEffect(() => { writeStore(state); }, [state]);

        const setState = useCallback((patch) => setRaw((prev) => Object.assign({}, prev, patch)), []);
        const flash = (msg) => {
          setToast(msg);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setToast(''), 2600);
        };

        const flags = useMemo(() => detectFlags(state.symptoms), [state.symptoms]);
        const gate = gateOf(state);
        const onCopy = () => copyText(buildBrief(state, [], gate), () => flash(t('copied')), () => flash(t('copyFail')));
        const onCopyRed = () => copyText(buildBrief(state, flags, gate), () => flash(t('copied')), () => flash(t('copyFail')));

        const header = h('div', { className: 'cw-head' },
          h('div', null, h('h1', null, t('title')), h('p', { className: 'cw-sub' }, t('subtitle'))),
          h('div', { className: 'cw-actions' },
            h('button', { onClick: () => setLang(lang === 'zh' ? 'en' : 'zh') }, lang === 'zh' ? 'EN' : '中'),
            h('button', {
              className: 'cw-danger',
              onClick: () => { if (window.confirm(t('resetConfirm'))) setRaw(emptyState()); },
            }, t('reset')),
            h('button', { className: 'cw-primary', onClick: onCopy }, t('copy'))));

        if (flags.length > 0) {
          return h('div', { className: 'cw' },
            header,
            h('div', { className: 'cw-red', role: 'alert' },
              h('h2', null, '⛔ ' + t('redFlag') + ' · ' + t('redFlagHit') + flags.map((f) => tv('flags', f)).join(' / ')),
              h('div', { className: 'cw-red-three' },
                h('div', null, h('b', null, t('redNow')), h('span', null, '（由对话给出）')),
                h('div', null, h('b', null, t('redWhere')), h('span', null, '（由对话给出）'))),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                h('button', { className: 'cw-primary', onClick: onCopyRed }, t('copyRed')),
                h('span', { className: 'cw-note' }, t('redCollapsed')))),
            toast ? h('p', { className: 'cw-note' }, toast) : null);
        }

        const gateCard = gate === 'ask'
          ? h('div', { className: 'cw-gate' },
            h('h2', null, t('gateTitle')),
            h('p', { style: { marginBottom: 8 } }, t('gateQ')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: () => setState({ pregnancy: 'yes' }) }, t('gateYes')),
              h('button', { onClick: () => setState({ pregnancy: 'no' }) }, t('gateNo')),
              h('button', { onClick: () => setState({ pregnancy: 'unknown' }) }, t('gateUnsure'))))
          : gate === 'on'
            ? h('div', { className: 'cw-gate' },
              h('h2', null, t('gateOnTitle')),
              h('p', { style: { marginBottom: 8 } }, t('gateOnBody')),
              h('b', { style: { fontSize: 12.5 } }, t('gateList')),
              h('ul', { style: { margin: '4px 0 8px', paddingInlineStart: 20, fontSize: 12.5 } },
                DICT[currentLang].gateDrugs.map((d, i) => h('li', { key: i }, d))),
              h('button', { onClick: () => setState({ pregnancy: 'unknown' }) }, t('gateAgain')))
            : null;

        const demos = h('div', { className: 'cw-card', style: { marginBottom: 12 } },
          h('h2', null, t('profile')),
          h('div', { className: 'cw-row' },
            h('label', { className: 'cw-field' }, h('span', null, t('sex')),
              h('select', { value: state.sex, onChange: (e) => setState({ sex: e.target.value }) },
                h('option', { value: '' }, '—'), h('option', { value: 'female' }, t('female')), h('option', { value: 'male' }, t('male')))),
            h(F, { label: t('age'), value: state.age, numeric: true, onChange: (v) => setState({ age: v }) })),
          h('label', { className: 'cw-field' }, h('span', null, t('symptoms')),
            h('textarea', { rows: 2, value: state.symptoms, onChange: (e) => setState({ symptoms: e.target.value }) })),
          h('div', { className: 'cw-gloss', style: { marginTop: 8 } },
            h('b', null, t('terms') + '：'),
            DICT[currentLang].glossary.map((pair, i) => h('span', { key: i }, (i > 0 ? '；' : ''), `${pair[0]} = ${pair[1]}`))));

        const cols = h('div', { className: 'cw-cols' },
          h('div', null, demos, h(Indicators, { rows: state.indicators, setRows: (indicators) => setState({ indicators }) })),
          h('div', null, h(Meds, { rows: state.meds, setRows: (meds) => setState({ meds }) })),
          h(Report, { state, setState, meds: state.meds }));

        return h('div', { className: 'cw' },
          header,
          gateCard,
          cols,
          h('div', { className: 'cw-fixed' }, t('disclaimer')),
          toast ? h('p', { className: 'cw-note', style: { marginTop: 10 } }, toast) : null);
      }

      function Icon({ size }) {
        const s = size || 20;
        return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
          h('path', { d: 'M4 13h3.2l1.6-3.4 2.4 6 2-4.2 1.6 1.6H20', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3, stroke: 'currentColor', strokeWidth: 1.4, opacity: 0.55 }));
      }

      const inject = ['slots'];

      function apply(ctx) {
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PLUGIN_ID }, Workbench));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PLUGIN_ID,
          order: 59,
          label: () => DICT[currentLang].panel,
        }, Icon));
      }

      module.exports = { apply, inject, name: PLUGIN_ID };
      return module.exports;
    };
  }

  window.__ModuleLoader__.load({ id: 'chronic-care-workbench', factory: makeFactory() });
})();
