/* =========================================================
   Q-SAFE DRAGON GUARDIAN THEME
   ========================================================= */

(function () {
    const VALID = new Set(["quantum-core", "cyber-neon", "clinical-secure", "threat-command", "neo-brutalism", "midnight-violet", "arctic-lab", "carbon-matrix", "dragon"]);

    function updateDragonTheme(themeName) {
        const active = themeName === "dragon";
        document.body.classList.toggle("dragon-theme-active", active);
    }

    function updateDragonThemeState(decision, modelKey) {
        const body = document.body;
        const readout = document.getElementById("dragonStateReadout");
        const decisionName = String(decision || "MONITOR").toUpperCase();

        body.classList.remove("dragon-accept", "dragon-monitor", "dragon-reject");
        if (decisionName === "ACCEPT") body.classList.add("dragon-accept");
        if (decisionName === "MONITOR") body.classList.add("dragon-monitor");
        if (decisionName === "REJECT") body.classList.add("dragon-reject");

        if (readout) {
            const suffix = modelKey ? ` · ${modelKey.toUpperCase()}` : "";
            const state = decisionName === "ACCEPT" ? "CALM" : decisionName === "MONITOR" ? "WATCH" : "ALERT";
            readout.textContent = `GUARDIAN // ${state}${suffix}`;
        }
    }

    window.updateDragonTheme = updateDragonTheme;
    window.updateDragonThemeState = updateDragonThemeState;

    document.addEventListener("DOMContentLoaded", () => {
        const theme = document.body.dataset.theme || "quantum-core";
        updateDragonTheme(VALID.has(theme) ? theme : "quantum-core");
    });
})();
