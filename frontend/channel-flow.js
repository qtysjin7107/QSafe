/* =========================================================
   Q-SAFE QUANTUM CHANNEL FLOW
   ========================================================= */

(function () {
    let track;
    let state = "secure";
    let particles = [];
    let timer = null;

    const stateLabels = {
        secure: "SECURE",
        monitor: "MONITOR",
        reject: "REJECT"
    };

    function createParticles() {
        track = document.getElementById("flowTrack");
        if (!track) return;
        track.innerHTML = "";
        particles = [];
        for (let i = 0; i < 9; i += 1) {
            const particle = document.createElement("span");
            particle.className = "flow-particle";
            particle.style.setProperty("--flow-delay", `${-(i * 0.55)}s`);
            particle.style.setProperty("--flow-top", `${44 + (i % 3 - 1) * 7}%`);
            track.appendChild(particle);
            particles.push(particle);
        }
        renderState();
    }

    function renderState() {
        const connection = document.getElementById("mainConnection") || document.getElementById("quantumConnection");
        if (connection) connection.dataset.state = state;
        const label = document.getElementById("channelStatus");
        if (label) label.textContent = stateLabels[state] || "SECURE";
        particles.forEach((particle, index) => {
            particle.classList.remove("flow-secure", "flow-monitor", "flow-reject");
            particle.classList.add(`flow-${state}`);
            particle.style.animationDelay = `${-(index * 0.45)}s`;
        });
    }

    function setChannelFlowState(nextState) {
        state = ["secure", "monitor", "reject"].includes(nextState) ? nextState : "secure";
        renderState();
    }

    window.setChannelFlowState = setChannelFlowState;

    document.addEventListener("DOMContentLoaded", () => {
        createParticles();
        clearInterval(timer);
        timer = setInterval(renderState, 1400);
    });
})();
