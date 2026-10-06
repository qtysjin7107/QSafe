/*
    Q-Safe Dragon Theme Controller
    --------------------------------
    Adds the Dragon Guardian visual language without changing
    the existing dashboard logic or other themes.
*/

(function () {

    "use strict";

    let active = false;
    let state = "normal";
    let frameId = null;
    let startTime = performance.now();
    let dots = [];

    const stateMeta = {
        normal: {
            label: "GUARDIAN // CALM",
            amplitude: 0,
            frequency: 1,
            speed: 0.0022,
            color: "#d8b86a",
            glow: "rgba(216, 184, 106, .55)"
        },
        monitor: {
            label: "GUARDIAN // ALERT",
            amplitude: 8,
            frequency: 2.2,
            speed: 0.0031,
            color: "#d99a43",
            glow: "rgba(217, 154, 67, .70)"
        },
        reject: {
            label: "GUARDIAN // WRATH",
            amplitude: 20,
            frequency: 6.4,
            speed: 0.0065,
            color: "#e2462f",
            glow: "rgba(226, 70, 47, .85)"
        }
    };

    function elements() {
        return {
            guardian: document.getElementById("dragonGuardian"),
            readout: document.getElementById("dragonStateReadout"),
            path: document.getElementById("dragonChannelPath"),
            glow: document.getElementById("dragonChannelGlow"),
            track: document.getElementById("dragonFlowTrack")
        };
    }

    function mapDecision(decision) {
        const value = String(decision || "MONITOR").toUpperCase();

        if (value === "ACCEPT") {
            return "normal";
        }

        if (value === "REJECT" || value === "CRITICAL" || value === "COMPROMISED") {
            return "reject";
        }

        return "monitor";
    }

    function createDots() {
        const { track } = elements();

        if (!track || dots.length) {
            return;
        }

        for (let i = 0; i < 7; i += 1) {
            const dot = document.createElement("span");
            dot.className = "dragon-flow-dot";
            track.appendChild(dot);
            dots.push({
                element: dot,
                progress: i / 7,
                speed: 0.000075 + Math.random() * 0.000025
            });
        }
    }

    function buildPoints(time) {
        const count = 26;
        const width = 700;
        const center = 60;
        const meta = stateMeta[state];
        const points = [];

        for (let i = 0; i < count; i += 1) {
            const p = i / (count - 1);
            const x = 8 + p * (width - 16);

            if (i === 0 || i === count - 1) {
                points.push(`${x.toFixed(2)},${center.toFixed(2)}`);
                continue;
            }

            const phase =
                time * meta.speed +
                p * Math.PI * 2 * meta.frequency;

            let y = center;

            if (state === "monitor") {
                y += Math.sin(phase) * meta.amplitude;
            }
            else if (state === "reject") {
                y += Math.sin(phase) * meta.amplitude;
                y += Math.sin(phase * 2.55 + 1.2) * 5.5;
                y += Math.cos(phase * 3.9) * 3.2;
            }

            points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }

        return points;
    }

    function pointAtProgress(progress, time) {
        const count = 26;
        const width = 700;
        const center = 60;
        const meta = stateMeta[state];
        const clamped = Math.max(0, Math.min(0.999999, progress));
        const scaled = clamped * (count - 1);
        const i0 = Math.floor(scaled);
        const i1 = Math.min(count - 1, i0 + 1);
        const local = scaled - i0;

        function point(i) {
            const p = i / (count - 1);
            const x = 8 + p * (width - 16);
            if (i === 0 || i === count - 1) {
                return { x, y: center };
            }
            const phase = time * meta.speed + p * Math.PI * 2 * meta.frequency;
            let y = center;
            if (state === "monitor") {
                y += Math.sin(phase) * meta.amplitude;
            } else if (state === "reject") {
                y += Math.sin(phase) * meta.amplitude;
                y += Math.sin(phase * 2.55 + 1.2) * 5.5;
                y += Math.cos(phase * 3.9) * 3.2;
            }
            return { x, y };
        }

        const a = point(i0);
        const b = point(i1);

        return {
            x: a.x + (b.x - a.x) * local,
            y: a.y + (b.y - a.y) * local
        };
    }

    function animate(time) {
        if (!active) {
            frameId = requestAnimationFrame(animate);
            return;
        }

        const { path, glow, guardian } = elements();
        const meta = stateMeta[state];

        if (path && glow) {
            const points = buildPoints(time);
            const pointString = points.join(" ");
            path.setAttribute("points", pointString);
            glow.setAttribute("points", pointString);
            path.style.stroke = meta.color;
            glow.style.stroke = meta.glow;
        }

        dots.forEach((dot) => {
            dot.progress += dot.speed * (state === "reject" ? 1.85 : 1);
            if (dot.progress > 1) {
                dot.progress -= 1;
            }

            const { x, y } = pointAtProgress(dot.progress, time);
            dot.element.style.left = `${(x / 700) * 100}%`;
            dot.element.style.top = `${(y / 120) * 100}%`;
        });

        if (guardian) {
            guardian.dataset.state = state;
        }

        frameId = requestAnimationFrame(animate);
    }

    function setState(nextState) {
        state = nextState in stateMeta ? nextState : "monitor";

        const { guardian, readout } = elements();
        const meta = stateMeta[state];

        if (guardian) {
            guardian.dataset.state = state;
        }

        if (readout) {
            readout.textContent = meta.label;
        }

        const connection = document.getElementById("quantumConnection");
        if (connection) {
            connection.dataset.flowState =
                state === "normal" ? "secure" : state;
        }
    }

    window.updateDragonTheme = function (themeName) {
        active = themeName === "dragon";

        const { guardian, readout } = elements();

        if (guardian) {
            guardian.style.display = active ? "block" : "none";
        }

        if (readout) {
            readout.style.display = active ? "block" : "none";
        }

        if (active) {
            createDots();
        }
    };

    window.updateDragonThemeState = function (decision) {
        setState(mapDecision(decision));
    };

    document.addEventListener("DOMContentLoaded", () => {
        createDots();
        setState("normal");
        startTime = performance.now();
        frameId = requestAnimationFrame(animate);

        const decision = document.getElementById("decision");
        if (decision) {
            const observer = new MutationObserver(() => {
                if (!active) {
                    return;
                }
                setState(mapDecision(decision.textContent));
            });

            observer.observe(decision, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    });

    window.addEventListener("beforeunload", () => {
        if (frameId) {
            cancelAnimationFrame(frameId);
        }
    });

})();
