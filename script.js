(function () {
  "use strict";

  const relationGroup = document.getElementById("relation-group");
  const detailChild = document.getElementById("detail-child");
  const detailParent = document.getElementById("detail-parent");
  const incomeSection = document.getElementById("income-section");
  const incomeStepLabel = document.getElementById("income-step-label");
  const incomeMainLabel = document.getElementById("income-main-label");

  const childAgeInput = document.getElementById("child-age");
  const childBracketHint = document.getElementById("child-bracket-hint");

  const parentAgeInput = document.getElementById("parent-age");
  const cohabitInputs = document.getElementsByName("cohabit");
  const employeeIncomeForParentWrap = document.getElementById("employee-income-for-parent-wrap");
  const employeeIncomeForParentInput = document.getElementById("employee-income-for-parent");
  const remittanceWrap = document.getElementById("remittance-wrap");
  const remittanceInput = document.getElementById("remittance");

  const incomeMainInput = document.getElementById("income-main");
  const toggleAdvancedBtn = document.getElementById("toggle-advanced");
  const advancedIncome = document.getElementById("advanced-income");
  const incomeSocialInput = document.getElementById("income-social");
  const incomeTaxInput = document.getElementById("income-tax");

  const wall106Wrap = document.getElementById("wall106-wrap");
  const wall106Input = document.getElementById("wall106");
  const employeeIncomeForSpouseWrap = document.getElementById("employee-income-for-spouse-wrap");
  const employeeIncomeForSpouseInput = document.getElementById("employee-income-for-spouse");

  const resultSection = document.getElementById("result");
  const emptyState = document.getElementById("empty-state");
  const socialVerdict = document.getElementById("social-verdict");
  const socialDetail = document.getElementById("social-detail");
  const taxVerdict = document.getElementById("tax-verdict");
  const taxDetail = document.getElementById("tax-detail");
  const wallMap = document.getElementById("wall-map");
  const resultNotes = document.getElementById("result-notes");

  const form = document.getElementById("checker-form");

  // ---- deduction tables from the reference sheet (table 5) ----
  const SPOUSE_STEPS = [
    { max: 169, ded: 38 },
    { max: 174, ded: 36 },
    { max: 179, ded: 31 },
    { max: 184, ded: 26 },
    { max: 189, ded: 21 },
    { max: 194, ded: 16 },
    { max: 199, ded: 11 },
    { max: 204, ded: 6 },
    { max: 207, ded: 3 },
  ];

  const CHILD_1922_STEPS = [
    { max: 159, ded: 63 },
    { max: 164, ded: 61 },
    { max: 169, ded: 51 },
    { max: 174, ded: 41 },
    { max: 179, ded: 31 },
    { max: 184, ded: 21 },
    { max: 189, ded: 11 },
    { max: 194, ded: 6 },
    { max: 197, ded: 3 },
  ];

  function stepLookup(steps, income) {
    for (const row of steps) {
      if (income <= row.max) return row.ded;
    }
    return 0;
  }

  function childBracket(age) {
    if (age <= 15) return "15under";
    if (age <= 18) return "16to18";
    if (age <= 22) return "19to22";
    return "23up";
  }

  const CHILD_BRACKET_LABEL = {
    "15under": "15歳以下",
    "16to18": "高校生（16〜18歳）",
    "19to22": "大学生世代（19〜22歳）",
    "23up": "23歳以上",
  };

  function fmt(n) {
    return Number.isFinite(n) ? n.toLocaleString("ja-JP") : "-";
  }

  // ---- UI wiring ----
  relationGroup.addEventListener("change", updateVisibility);
  childAgeInput.addEventListener("input", updateVisibility);
  parentAgeInput.addEventListener("input", updateVisibility);
  for (const el of cohabitInputs) el.addEventListener("change", updateVisibility);

  toggleAdvancedBtn.addEventListener("click", () => {
    const hidden = advancedIncome.hasAttribute("hidden");
    if (hidden) {
      advancedIncome.removeAttribute("hidden");
      toggleAdvancedBtn.textContent = "見込みと実績を1つにまとめる";
    } else {
      advancedIncome.setAttribute("hidden", "");
      toggleAdvancedBtn.textContent = "見込みと実績の金額が違う場合はこちら";
    }
    compute();
  });

  form.addEventListener("input", compute);
  form.addEventListener("change", compute);

  function getRelation() {
    const checked = document.querySelector('input[name="relation"]:checked');
    return checked ? checked.value : null;
  }

  function getCohabit() {
    const checked = document.querySelector('input[name="cohabit"]:checked');
    return checked ? checked.value : null;
  }

  function updateVisibility() {
    const relation = getRelation();

    detailChild.hidden = relation !== "child";
    detailParent.hidden = relation !== "parent";
    incomeSection.hidden = !relation;
    wall106Wrap.hidden = !(relation === "spouse" || relation === "child");
    employeeIncomeForSpouseWrap.hidden = relation !== "spouse";

    if (relation === "child") {
      const age = Number(childAgeInput.value);
      if (childAgeInput.value !== "" && Number.isFinite(age)) {
        const bracket = childBracket(age);
        childBracketHint.textContent = "区分：" + CHILD_BRACKET_LABEL[bracket];
      } else {
        childBracketHint.textContent = "";
      }
    }

    if (relation === "parent") {
      const cohabit = getCohabit();
      employeeIncomeForParentWrap.hidden = cohabit !== "together";
      remittanceWrap.hidden = cohabit !== "apart";
    }

    if (relation === "spouse") {
      incomeStepLabel.textContent = "3. 配偶者の年収の入力";
      incomeMainLabel.textContent = "配偶者の年収（見込み・実績）（万円）";
    } else if (relation === "child") {
      incomeStepLabel.textContent = "3. お子さんの年収の入力";
      incomeMainLabel.textContent = "お子さんの年収（見込み・実績）（万円）";
    } else if (relation === "parent") {
      incomeStepLabel.textContent = "3. 親御さんの年収の入力";
      incomeMainLabel.textContent = "親御さんの年収（万円・年金収入も含む）";
    }

    compute();
  }

  function getIncomes() {
    const useAdvanced = !advancedIncome.hasAttribute("hidden");
    if (useAdvanced) {
      return {
        social: Number(incomeSocialInput.value),
        tax: Number(incomeTaxInput.value),
      };
    }
    const main = Number(incomeMainInput.value);
    return { social: main, tax: main };
  }

  function compute() {
    const relation = getRelation();
    if (!relation) {
      resultSection.hidden = true;
      emptyState.hidden = false;
      return;
    }

    const { social: socialIncome, tax: taxIncome } = getIncomes();
    if (!Number.isFinite(socialIncome) || !Number.isFinite(taxIncome) || incomeMainInput.value === "" && advancedIncome.hasAttribute("hidden")) {
      resultSection.hidden = true;
      emptyState.hidden = false;
      return;
    }

    let social = { ok: false, label: "", detail: "" };
    let tax = { deduction: 0, label: "", detail: "" };
    let notes = [];
    let wallTicks = [];
    let socialLine = null;
    let taxBand = null;

    const wall106Checked = wall106Input.checked && !wall106Wrap.hidden;

    if (relation === "spouse") {
      const socialLimit = 130;
      let socialOk = socialIncome < socialLimit;
      if (wall106Checked) {
        socialOk = false;
        notes.push("週20時間以上・従業員51人以上のパート先では、130万円未満でもご本人が社会保険に加入するため、扶養からは外れます（第3号にもなれません）。");
      }
      social.ok = socialOk;
      social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
      social.detail = `社会保険の扶養は年収130万円未満（これから1年の見込み）が条件です。入力された見込み年収は${fmt(socialIncome)}万円です。`;

      const ded = stepLookup(SPOUSE_STEPS, taxIncome);
      tax.deduction = ded;
      if (taxIncome <= 136) {
        tax.label = `配偶者控除　${ded}万円`;
      } else if (ded > 0) {
        tax.label = `配偶者特別控除　${ded}万円`;
      } else {
        tax.label = "控除なし（対象外）";
      }
      tax.detail = "136万円以下は配偶者控除38万円、169万円までは配偶者特別控除も満額38万円のまま、以降207万円超まで段階的に減っていきます。";

      const ownIncome = Number(employeeIncomeForSpouseInput.value);
      if (Number.isFinite(ownIncome) && ownIncome > 900) {
        notes.push(`あなた（社員本人）の年収が900万円を超えているため、配偶者控除・配偶者特別控除はさらに減額されます（1,000万円超でゼロ）。正確な金額は総務にご確認ください。`);
      }

      wallTicks = [
        { value: 106, note: "条件次第で自分の勤務先の社保に加入" },
        { value: 130, note: "社保扶養の壁" },
        { value: 136, note: "配偶者控除の壁" },
        { value: 169, note: "満額38万の上限" },
        { value: 207, note: "控除ゼロ" },
      ];
      socialLine = { from: 0, to: 130 };
      taxBand = { from: 0, to: 207 };
    }

    if (relation === "child") {
      const age = Number(childAgeInput.value);
      if (!Number.isFinite(age) || childAgeInput.value === "") {
        resultSection.hidden = true;
        emptyState.hidden = false;
        return;
      }
      const bracket = childBracket(age);

      if (bracket === "15under") {
        const socialOk = socialIncome < 130 && !wall106Checked;
        social.ok = socialOk;
        social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
        social.detail = "年収130万円未満（通常は問題になりません）。";
        tax.deduction = 0;
        tax.label = "扶養控除の対象外（児童手当の対象）";
        tax.detail = "15歳以下は税金の扶養控除はありません。年末調整の申告書「16歳未満の扶養親族」欄には記載します。";
        wallTicks = [{ value: 130, note: "社保扶養の壁" }];
        socialLine = { from: 0, to: 130 };
      }

      if (bracket === "16to18") {
        let socialOk = socialIncome < 130;
        if (wall106Checked) { socialOk = false; notes.push("週20時間以上・従業員51人以上のパート先では、130万円未満でもご本人が社会保険に加入し、扶養からは外れます。"); }
        social.ok = socialOk;
        social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
        social.detail = `社会保険の扶養は年収130万円未満（これから1年の見込み）が条件です。入力された見込み年収は${fmt(socialIncome)}万円です。`;
        const ok = taxIncome <= 136;
        tax.deduction = ok ? 38 : 0;
        tax.label = ok ? "扶養控除　38万円" : "控除なし（対象外）";
        tax.detail = "136万円以下で扶養控除38万円。1円でも超えると控除は全額なくなります（段階的な減額はありません）。";
        wallTicks = [
          { value: 130, note: "社保扶養の壁" },
          { value: 136, note: "扶養控除の壁" },
        ];
        socialLine = { from: 0, to: 130 };
        taxBand = { from: 0, to: 136 };
      }

      if (bracket === "19to22") {
        let socialOk = socialIncome < 150;
        if (wall106Checked) { socialOk = false; notes.push("週20時間以上・従業員51人以上のパート先では、150万円未満でもご本人が社会保険に加入し、扶養からは外れます。"); }
        social.ok = socialOk;
        social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
        social.detail = `社会保険の扶養は年収150万円未満（これから1年の見込み・2025年10月〜）が条件です。入力された見込み年収は${fmt(socialIncome)}万円です。23歳になると130万円未満に戻ります。20歳からの国民年金はご本人が加入します（学生納付特例あり）。`;
        const ded = stepLookup(CHILD_1922_STEPS, taxIncome);
        tax.deduction = ded;
        tax.label = ded > 0 ? `扶養控除／特定親族特別控除　${ded}万円` : "控除なし（対象外）";
        tax.detail = "136万円以下は扶養控除63万円、159万円までは特定親族特別控除も満額63万円のまま、以降197万円超まで段階的に減っていきます。";
        wallTicks = [
          { value: 130, note: "23歳以降はここに戻る" },
          { value: 136, note: "扶養控除の壁" },
          { value: 150, note: "社保扶養の壁" },
          { value: 159, note: "満額63万の上限" },
          { value: 197, note: "控除ゼロ" },
        ];
        socialLine = { from: 0, to: 150 };
        taxBand = { from: 0, to: 197 };
      }

      if (bracket === "23up") {
        let socialOk = socialIncome < 130;
        if (wall106Checked) { socialOk = false; notes.push("週20時間以上・従業員51人以上のパート先では、130万円未満でもご本人が社会保険に加入し、扶養からは外れます。"); }
        social.ok = socialOk;
        social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
        social.detail = `社会保険の扶養は年収130万円未満（これから1年の見込み）が条件です。入力された見込み年収は${fmt(socialIncome)}万円です。国民年金はご本人が加入します。`;
        const ok = taxIncome <= 136;
        tax.deduction = ok ? 38 : 0;
        tax.label = ok ? "扶養控除　38万円" : "控除なし（対象外）";
        tax.detail = "136万円以下で扶養控除38万円。超えると控除は全額なくなります。";
        wallTicks = [
          { value: 130, note: "社保扶養の壁" },
          { value: 136, note: "扶養控除の壁" },
        ];
        socialLine = { from: 0, to: 130 };
        taxBand = { from: 0, to: 136 };
      }
    }

    if (relation === "parent") {
      const age = Number(parentAgeInput.value);
      const cohabit = getCohabit();
      if (!Number.isFinite(age) || parentAgeInput.value === "" || !cohabit) {
        resultSection.hidden = true;
        emptyState.hidden = false;
        return;
      }

      if (age < 60) {
        notes.push("この資料は60歳以上の親族を想定しています。60歳未満の親御さんを扶養に入れる場合は、条件が異なりますので総務にご相談ください。");
      }

      let socialOk = socialIncome < 180 && !wall106Checked;
      let conditionText = "";
      if (cohabit === "together") {
        const ownIncome = Number(employeeIncomeForParentInput.value);
        if (Number.isFinite(ownIncome) && ownIncome > 0) {
          const half = ownIncome / 2;
          const conditionOk = socialIncome < half;
          socialOk = socialOk && conditionOk;
          conditionText = `同居の場合、親御さんの年収があなたの年収（${fmt(ownIncome)}万円）の半分（${fmt(half)}万円）未満であることも条件です。`;
        } else {
          conditionText = "同居の場合、親御さんの年収があなたの年収の半分未満であることも条件です（あなたの年収を入力すると判定できます）。";
        }
      } else {
        const remittance = Number(remittanceInput.value);
        if (Number.isFinite(remittance) && remittance > 0) {
          const conditionOk = socialIncome < remittance;
          socialOk = socialOk && conditionOk;
          conditionText = `別居の場合、親御さんの年収が仕送り額（${fmt(remittance)}万円）より少ないことも条件です。`;
        } else {
          conditionText = "別居の場合、親御さんの年収が仕送り額より少ないことも条件です（仕送り額を入力すると判定できます）。";
        }
      }

      social.ok = socialOk;
      social.label = socialOk ? "扶養に入れる（対象）" : "扶養から外れる（対象外）";
      social.detail = `社会保険の扶養は年収180万円未満（年金収入も含む）が条件です。入力された年収は${fmt(socialIncome)}万円です。${conditionText}`;
      notes.push("年金収入だけの場合の目安は年金収入172万円以下（65歳以上）です。");

      const taxOk = taxIncome <= 136;
      let ded = 0;
      if (taxOk) {
        if (age < 70) ded = 38;
        else ded = cohabit === "together" ? 58 : 48;
      }
      tax.deduction = ded;
      tax.label = ded > 0 ? `扶養控除　${ded}万円` : "控除なし（対象外）";
      tax.detail = "136万円以下で扶養控除38万円、70歳以上は48万円、70歳以上で同居なら58万円です。";

      wallTicks = [
        { value: 136, note: "扶養控除の壁" },
        { value: 180, note: "社保扶養の壁" },
      ];
      socialLine = { from: 0, to: 180 };
      taxBand = { from: 0, to: 136 };
    }

    renderResult(relation, social, tax, notes, wallTicks, socialLine, taxBand, socialIncome, taxIncome);
  }

  function renderResult(relation, social, tax, notes, wallTicks, socialLine, taxBand, socialIncome, taxIncome) {
    resultSection.hidden = false;
    emptyState.hidden = true;

    socialVerdict.textContent = social.label;
    socialVerdict.className = "verdict " + (social.ok ? "ok" : "ng");
    socialDetail.textContent = social.detail;

    taxVerdict.textContent = tax.label;
    taxVerdict.className = "verdict " + (tax.deduction > 0 ? "ok" : "ng");
    taxDetail.textContent = tax.detail;

    resultNotes.innerHTML = "";
    const allNotes = notes.slice();
    allNotes.push("この資料は2026年（令和8年分）専用の数字です。2027年以降は変わります。");
    for (const n of allNotes) {
      const p = document.createElement("p");
      p.textContent = n;
      resultNotes.appendChild(p);
    }

    renderWallMap(wallTicks, socialLine, taxBand, socialIncome, taxIncome);
  }

  function renderWallMap(ticks, socialLine, taxBand, socialIncome, taxIncome) {
    wallMap.innerHTML = "";
    if (!ticks || ticks.length === 0) return;

    const maxTick = Math.max(...ticks.map((t) => t.value));
    const maxIncome = Math.max(socialIncome || 0, taxIncome || 0);
    const scaleMax = Math.max(maxTick, maxIncome) * 1.15;

    const track = document.createElement("div");
    track.className = "track";

    if (taxBand) {
      const band = document.createElement("div");
      band.className = "band tax";
      band.style.left = (taxBand.from / scaleMax * 100) + "%";
      band.style.width = ((taxBand.to - taxBand.from) / scaleMax * 100) + "%";
      track.appendChild(band);
    }
    if (socialLine) {
      const band = document.createElement("div");
      band.className = "band social";
      band.style.left = (socialLine.from / scaleMax * 100) + "%";
      band.style.width = ((socialLine.to - socialLine.from) / scaleMax * 100) + "%";
      track.appendChild(band);
    }

    const MAX_ROWS = 3;
    const lastPercentByRow = new Array(MAX_ROWS).fill(-Infinity);

    for (const t of ticks) {
      const percent = (t.value / scaleMax) * 100;

      let row = 0;
      let bestGap = -Infinity;
      for (let r = 0; r < MAX_ROWS; r++) {
        const gap = lastPercentByRow[r] === -Infinity ? Infinity : Math.abs(percent - lastPercentByRow[r]);
        if (gap > bestGap) {
          bestGap = gap;
          row = r;
        }
      }
      lastPercentByRow[row] = percent;

      const line = document.createElement("div");
      line.className = "tick-line";
      line.style.left = percent + "%";
      track.appendChild(line);

      const label = document.createElement("div");
      label.className = "tick-label";
      label.style.left = percent + "%";
      label.style.top = -(24 + row * 18) + "px";
      label.textContent = t.value + "万";
      track.appendChild(label);
    }

    const markerValue = Math.max(socialIncome || 0, taxIncome || 0);
    if (markerValue > 0) {
      const marker = document.createElement("div");
      marker.className = "marker";
      marker.style.left = (markerValue / scaleMax * 100) + "%";
      track.appendChild(marker);
    }

    wallMap.appendChild(track);

    const legend = document.createElement("p");
    legend.className = "hint";
    legend.innerHTML = '<span style="color:#2f6fb0">■</span> あなたの税金が安くなる範囲　　<span style="color:#c9722a">■</span> ご家族があなたの社会保険に入れる範囲';
    wallMap.appendChild(legend);

    if (ticks.some((t) => t.note)) {
      const list = document.createElement("ul");
      list.className = "wall-legend";
      for (const t of ticks) {
        if (!t.note) continue;
        const li = document.createElement("li");
        li.textContent = `${t.value}万円：${t.note}`;
        list.appendChild(li);
      }
      wallMap.appendChild(list);
    }
  }

  updateVisibility();
})();
