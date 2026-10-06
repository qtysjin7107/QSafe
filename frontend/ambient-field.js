/* =========================================================
   Q-SAFE AMBIENT FIELD
   Theme-aware particle background
   Keep particleCount at 950 for the full-density field.
   ========================================================= */

(() => {
    const CONFIG = {
        particleCount: 950,
        maxConnections: 28,
        connectionDistance: 105,
        mouseRadius: 150
    };

    const canvas = document.getElementById("ambient-field");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const THEMES = {
        "quantum-core": { primary: "#55d6ff", secondary: "#7b61ff", type: "quantum" },
        "cyber-neon": { primary: "#00f5ff", secondary: "#ff00e5", type: "quantum" },
        "clinical-secure": { primary: "#63d7ff", secondary: "#58a6ff", type: "dots" },
        "threat-command": { primary: "#ffb84d", secondary: "#ff5c5c", type: "square" },
        "neo-brutalism": { primary: "#0057ff", secondary: "#ff3b30", type: "square" },
        "midnight-violet": { primary: "#b58cff", secondary: "#ff68d8", type: "quantum" },
        "arctic-lab": { primary: "#3f9bd6", secondary: "#9ad7ff", type: "dots" },
        "carbon-matrix": { primary: "#70df88", secondary: "#46b76c", type: "matrix" },
        "dragon": { primary: "#e7b85f", secondary: "#b63c32", type: "dragon" }
    };

    let width = 0;
    let height = 0;
    let particles = [];
    let mouse = { x: 0, y: 0, active: false };

    function themeConfig() {
        return THEMES[document.body.dataset.theme] || THEMES["quantum-core"];
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        initializeParticles();
    }

    function initializeParticles() {
        const config = themeConfig();
        particles = [];
        for (let i = 0; i < CONFIG.particleCount; i += 1) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.24,
                vy: (Math.random() - 0.5) * 0.24,
                size: Math.random() * 1.6 + 0.55,
                alpha: Math.random() * 0.55 + 0.1,
                phase: Math.random() * Math.PI * 2,
                type: config.type
            });
        }
    }

    function drawParticle(particle, config, time) {
        const pulse = (Math.sin(time * 0.0016 + particle.phase) + 1) / 2;
        const alpha = particle.alpha * (0.65 + pulse * 0.55);
        ctx.save();
        ctx.globalAlpha = alpha;

        if (config.type === "square" || config.type === "matrix") {
            ctx.fillStyle = config.primary;
            const size = particle.size * (config.type === "matrix" ? 1.1 : 1.3);
            ctx.fillRect(particle.x, particle.y, size, size);
        } else if (config.type === "dragon") {
            ctx.strokeStyle = config.primary;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 1.7, 0.2, Math.PI + 0.9);
            ctx.stroke();
            ctx.fillStyle = config.secondary;
            ctx.beginPath();
            ctx.arc(particle.x + particle.size, particle.y - particle.size, particle.size * 0.75, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = config.primary;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawConnections(config) {
        const step = Math.max(1, Math.floor(particles.length / 350));
        ctx.lineWidth = 0.45;
        for (let i = 0; i < particles.length; i += step) {
            const a = particles[i];
            for (let j = i + 1; j < Math.min(particles.length, i + CONFIG.maxConnections); j += 1) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.hypot(dx, dy);
                if (distance > CONFIG.connectionDistance) continue;
                const opacity = (1 - distance / CONFIG.connectionDistance) * 0.07;
                ctx.strokeStyle = config.secondary;
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    function updateParticles() {
        particles.forEach(particle => {
            if (mouse.active) {
                const dx = particle.x - mouse.x;
                const dy = particle.y - mouse.y;
                const distance = Math.hypot(dx, dy);
                if (distance < CONFIG.mouseRadius && distance > 0) {
                    const force = (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius;
                    particle.vx += (dx / distance) * force * 0.005;
                    particle.vy += (dy / distance) * force * 0.005;
                }
            }

            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < -10) particle.x = width + 10;
            if (particle.x > width + 10) particle.x = -10;
            if (particle.y < -10) particle.y = height + 10;
            if (particle.y > height + 10) particle.y = -10;

            particle.vx *= 0.995;
            particle.vy *= 0.995;
        });
    }

    function draw(time) {
        const config = themeConfig();
        ctx.clearRect(0, 0, width, height);
        drawConnections(config);
        particles.forEach(particle => drawParticle(particle, config, time));
        updateParticles();
        requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", event => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        mouse.active = true;
    });
    window.addEventListener("mouseleave", () => { mouse.active = false; });

    resize();
    requestAnimationFrame(draw);
})();
