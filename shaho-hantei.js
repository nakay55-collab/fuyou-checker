(function () {
  "use strict";

  const form = document.getElementById("shaho-form");
  const ageInput = document.getElementById("age");
  const renewableInput = document.getElementById("renewable");
  const durationInput = document.getElementById("duration");
  const weeklyHoursInput = document.getElementById("weekly-hours");
  const monthlyDaysInput = document.getElementById("monthly-days");
  const studentInput = document.getElementById("student");
  const companySizeInput = document.getElementById("company-size");

  const resultSection = document.getElementById("result");
  const emptyState = document.getElementById("empty-state");
  const hpVerdict = document.getElementById("hp-verdict");
  const hpDetail = document.getElementById("hp-detail");
  const eiVerdict = document.getElementById("ei-verdict");
  const eiDetail = document.getElementById("ei-detail");
  const resultNotes = document.getElementById("result-notes");

  let hasSubmitted = false;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hasSubmitted = true;
    compute();
  });

  function showIncomplete(message) {
    resultSection.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = hasSubmitted
      ? message
      : "年齢と働き方を入力してから「判定する」ボタンを押してください。";
  }

  function compute() {
    const age = Number(ageInput.value);
    if (ageInput.value === "" || !Number.isFinite(age)) {
      showIncomplete("年齢を入力してください。");
      return;
    }

    const weeklyHours = Number(weeklyHoursInput.value);
    if (weeklyHoursInput.value === "" || !Number.isFinite(weeklyHours)) {
      showIncomplete("1週間の所定労働時間を入力してください。");
      return;
    }

    const monthlyDays = monthlyDaysInput.value === "" ? null : Number(monthlyDaysInput.value);
    const renewable = renewableInput.checked;
    const duration = durationInput.value;
    const student = studentInput.value;
    const companySize = companySizeInput.value;

    const notes = [];

    // ---- 健康保険・厚生年金 ----
    let hpResult = { enrolled: false, label: "", detail: "" };

    if (age >= 75) {
      hpResult.enrolled = false;
      hpResult.label = "対象外（後期高齢者医療へ）";
      hpResult.detail = "75歳以上は会社の健康保険の対象外となり、後期高齢者医療制度に加入します。厚生年金も70歳以上のため対象外です。";
    } else {
      const conditionA = renewable && weeklyHours >= 30 && monthlyDays !== null && monthlyDays >= 17;
      const conditionB = duration === "over2m" && weeklyHours >= 20 && student !== "day" && companySize === "51plus";

      if (conditionA) {
        hpResult.enrolled = true;
        hpResult.label = age >= 70 ? "健康保険のみ加入（フルタイム区分・A）" : "加入する（フルタイム区分・A）";
        hpResult.detail = "雇用契約の更新見込み、週30時間以上、月17日以上のすべてに該当するため、フルタイムの基準で加入します。";
        if (age >= 70) notes.push("70歳以上のため厚生年金は資格を失っており、健康保険のみの加入になります。");
      } else if (conditionB) {
        hpResult.enrolled = true;
        hpResult.label = age >= 70 ? "健康保険のみ加入（短時間区分・B）" : "加入する（短時間区分・B）";
        hpResult.detail = "雇用期間2ヶ月以上見込み、週20時間以上、学生でない（夜間・通信制は可）、勤務先の従業員51人以上のすべてに該当するため、短時間労働者の基準で加入します。";
        if (age >= 70) notes.push("70歳以上のため厚生年金は資格を失っており、健康保険のみの加入になります。");
      } else {
        hpResult.enrolled = false;
        hpResult.label = "加入しない（C）";
        let reasons = [];
        if (weeklyHours < 20) reasons.push("週の所定労働時間が20時間未満");
        if (!conditionA && !conditionB) {
          if (weeklyHours >= 20 && duration !== "over2m") reasons.push("雇用期間の見込みが2ヶ月未満");
          if (weeklyHours >= 20 && student === "day") reasons.push("昼間学生である");
          if (weeklyHours >= 20 && companySize !== "51plus") reasons.push("勤務先の従業員数が51人未満、または不明");
        }
        hpResult.detail = reasons.length
          ? `フルタイム・短時間いずれの加入条件も満たしません（${reasons.join("・")}）。`
          : "フルタイム・短時間いずれの加入条件も満たしません。";
      }
    }

    hpVerdict.textContent = hpResult.label;
    hpVerdict.className = "verdict " + (hpResult.enrolled ? "ng" : "ok");
    hpDetail.textContent = hpResult.detail;

    if (hpResult.enrolled) {
      notes.push("健康保険・厚生年金に加入することになる場合、収入の金額に関わらず配偶者や親などの社会保険の扶養からは外れます。");
    }

    // ---- 雇用保険 ----
    let eiResult = { enrolled: false, label: "", detail: "" };
    const eiDurationOk = duration !== "under31";
    const eiStudentOk = student !== "day";
    const eiConditions = eiDurationOk && weeklyHours >= 20 && eiStudentOk;

    if (eiConditions) {
      eiResult.enrolled = true;
      eiResult.label = "加入する";
      eiResult.detail = "雇用契約期間が31日を超え、週20時間以上働き、昼間学生でない（夜間・通信制は加入対象）ため、雇用保険に加入します。";
    } else {
      eiResult.enrolled = false;
      eiResult.label = "加入しない";
      let reasons = [];
      if (!eiDurationOk) reasons.push("雇用契約期間が31日以内");
      if (weeklyHours < 20) reasons.push("週の所定労働時間が20時間未満");
      if (!eiStudentOk) reasons.push("昼間学生である");
      eiResult.detail = reasons.length ? `条件を満たしません（${reasons.join("・")}）。` : "条件を満たしません。";
    }

    eiVerdict.textContent = eiResult.label;
    eiVerdict.className = "verdict " + (eiResult.enrolled ? "ng" : "ok");
    eiDetail.textContent = eiResult.detail;

    notes.push("この判定は2026年10月1日時点の基準です。企業規模要件は今後、51人以上→2027年10月:36人以上→2029年10月:21人以上→2032年10月:11人以上→2035年10月:全企業の順に段階的に広がる予定です。");

    resultNotes.innerHTML = "";
    for (const n of notes) {
      const p = document.createElement("p");
      p.textContent = n;
      resultNotes.appendChild(p);
    }

    resultSection.hidden = false;
    emptyState.hidden = true;
  }
})();
