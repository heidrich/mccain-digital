/* ============================================================================
 * Contact page form — pill toggles (project type / budget / timeframe) + the
 * Web3Forms submit, carrying every field. access_key is public by design.
 * ========================================================================== */
(function () {
  "use strict";
  function boot() {
    var d = document;
    var form = d.getElementById("cpForm");
    if (!form) return;

    // pill visual state (works for both checkbox groups and radio groups)
    [].forEach.call(form.querySelectorAll(".cp-pill"), function (pill) {
      var input = pill.querySelector("input");
      if (!input) return;
      function sync() {
        if (input.type === "radio") {
          // clear siblings in the same radio group
          var group = form.querySelectorAll('input[name="' + input.name + '"]');
          [].forEach.call(group, function (g) {
            var p = g.closest(".cp-pill");
            if (p) p.classList.toggle("is-on", g.checked);
          });
        } else {
          pill.classList.toggle("is-on", input.checked);
        }
      }
      input.addEventListener("change", sync);
      sync();
    });

    // clear invalid state on input
    [].forEach.call(form.querySelectorAll("input,textarea"), function (el) {
      el.addEventListener("input", function () { el.removeAttribute("aria-invalid"); });
    });

    function collect(name) {
      return [].map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }).join(", ");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = d.getElementById("cpOk");
      if (ok) ok.style.display = "none";
      if (!form.checkValidity()) {
        form.querySelectorAll(":invalid").forEach(function (el) { el.setAttribute("aria-invalid", "true"); });
        form.reportValidity();
        return;
      }
      var bot = form.querySelector('[name="botcheck"]');
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: "d3e1fa0a-cbe1-45cd-b823-c63eff37c66a",
          subject: "New project inquiry via mccain-digital.com",
          name: form.name.value,
          email: form.email.value,
          project_type: collect("type") || "—",
          budget: (form.budget && form.budget.value) || "—",
          timeframe: (form.timeframe && form.timeframe.value) || "—",
          message: form.message.value,
          botcheck: bot && bot.checked ? bot.value : ""
        })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res.success) {
          if (ok) ok.style.display = "block";
          form.querySelectorAll("input,textarea").forEach(function (i) {
            if (i.type === "checkbox" || i.type === "radio") { i.checked = false; var p = i.closest(".cp-pill"); if (p) p.classList.remove("is-on"); }
            else i.value = "";
          });
          if (ok) ok.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          alert("Something went wrong — please email us directly at info@mccain-digital.com");
        }
      }).catch(function () {
        alert("Something went wrong — please email us directly at info@mccain-digital.com");
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
