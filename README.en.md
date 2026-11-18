# Chronic Care Team · DSH plugin

English | [中文](README.md)

A chronic-care panel for **the patient themselves**. Symptoms first, numbers second: record blood pressure, glucose, weight, waist, uric acid and eGFR; trend charts draw medication events as vertical lines, with self-adjusted doses as red dashed lines.

The one sentence that matters sits at the top of the report and cannot be shrunk:

> **Treatment adjustments must be made under a physician's guidance.**
> Any increase, reduction, discontinuation, switch or injection-dose change requires contacting the treating physician first.

## What you get

| Installed | Content |
|---|---|
| **Sidebar panel** `Chronic Care` | Three columns: health profile, medication timeline, report |
| **Skill** `chronic-care-team` | Care-director standard: six inviolable rules, pregnancy gate, A/B/C data reliability, four-level care-seeking advice |
| One click | **Copy health brief** puts the fact pack on the clipboard |

## Inside the panel

- **Health profile** — every entry carries value / unit / date / measuring condition / **A・B・C reliability**. Grade C never feeds a target conclusion.
- **Medication timeline** — drug, dose, start/stop, and **who decided** (doctor or self-adjusted). Self-adjusted entries are highlighted separately: time and content only, prompt to contact the physician, **no judgement and no new dose**.
- **Trend charts** — self-contained inline SVG; no network, no CDN. One subplot per indicator, a light band for the target range, vertical lines for medication events, red dashed lines for self-adjusted doses.
- **Red flags** — sudden severe headache / one-sided weakness / chest pain over 10 minutes / breathlessness or pink frothy sputum / unconscious hypoglycemia / vomiting with deep rapid breathing / sharply reduced urine with edema. Any hit turns the banner red and pins it: only "what to do now" and "seek emergency care / call 120" remain.
- **Pregnancy gate** — women are asked about pregnancy or plans within six months. Unclear or missing answers are treated as **possibly pregnant**: medication advice pauses, and a physician checklist appears (ACEI/ARB, statins, semaglutide, SGLT2i, urate-lowering drugs, anticoagulants) with obstetric + prescribing-specialist co-management.
- **Three conclusions + four care levels** — health advice / diet guidance / care-seeking advice, plus stay home · clinic follow-up · specialist soon · emergency now.
- **Plain language first** — a small glossary lives in the panel ("systolic = the top number when blood pressure is measured").

## Flow

1. Open `Chronic Care` in the sidebar; fill sex and age first (the pregnancy gate needs them).
2. Add indicators and medications; write any symptoms into the symptom box.
3. Hit **Copy health brief** and paste it into the chat.
4. The chat answers under `chronic-care-team`; paste the conclusions back to keep them.

## Install

```sh
dsh plugin --profile web add "https://github.com/flying-ovaltine/chronic-care-workbench/releases/latest/download/dsh-chronic-care-team.tgz"
```

## Privacy and boundaries

- Data stays in **local browser storage**; nothing is uploaded, and the UI never echoes real names, hospital IDs or ID-card numbers.
- **No diagnosis, no prescriptions** — analysis and a path only.
- For health management and education only; not medical advice. With a red-flag symptom, seek emergency care immediately.

## License

MIT © Yang Yang
