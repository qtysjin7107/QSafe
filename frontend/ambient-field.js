/*
    Q-Safe Ambient Background Field
    --------------------------------

    Theme-aware ambient particle system.

    Themes:
        quantum-core
        cyber-neon
        clinical-secure
        threat-command
        neo-brutalism
        midnight-violet
        arctic-lab
        carbon-matrix

    Features:
        - Custom particle geometry per theme
        - Slow ambient movement
        - Mouse repulsion
        - Mouse bulge / glow
        - Theme-specific particle animation
        - Theme-specific connecting lines
        - No backend/API dependency
*/


(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CONFIG = {

        particleCount: 950,

        maxConnectionDistance: 105,

        mouseRadius: 150,

        mouseForce: 0.85,

        baseSpeed: 0.16,

        particleMinSize: 1.2,

        particleMaxSize: 2.8,

        baseOpacity: 0.32,

        connectionOpacity: 0.10

    };


    /* =====================================================
       THEME DEFINITIONS
       ===================================================== */

    const THEMES = {

        "quantum-core": {

            primary: "#55e6a5",

            secondary: "#62a9ff",

            particleType: "quantum",

            lineType: "soft"

        },


        "cyber-neon": {

            primary: "#4deaff",

            secondary: "#9b6cff",

            particleType: "circuit",

            lineType: "neon"

        },


        "clinical-secure": {

            primary: "#55ded5",

            secondary: "#4ca2e4",

            particleType: "clinical",

            lineType: "clean"

        },


        "threat-command": {

            primary: "#ffad5a",

            secondary: "#ff5e57",

            particleType: "hazard",

            lineType: "hazard"

        },


        "neo-brutalism": {

            primary: "#ff4f8b",

            secondary: "#693eff",

            particleType: "brutal",

            lineType: "brutal"

        },


        "midnight-violet": {

            primary: "#c084ff",

            secondary: "#7e6cff",

            particleType: "crystal",

            lineType: "violet"

        },


        "arctic-lab": {

            primary: "#1677c8",

            secondary: "#5db8ed",

            particleType: "arctic",

            lineType: "arctic"

        },


        "carbon-matrix": {

            primary: "#70df88",

            secondary: "#3fae61",

            particleType: "matrix",

            lineType: "matrix"

        }

    };


    /* =====================================================
       STATE
       ===================================================== */

    let canvas;

    let ctx;

    let width = 0;

    let height = 0;

    let particles = [];

    let animationId = null;

    let mouse = {

        x: -1000,

        y: -1000,

        active: false

    };


    /* =====================================================
       CURRENT THEME
       ===================================================== */

    function getCurrentThemeName() {

        const theme =
            document.body.dataset.theme ||
            document.documentElement.dataset.theme ||
            "quantum-core";


        if (
            THEMES[theme]
        ) {

            return theme;

        }


        return "quantum-core";

    }


    function getCurrentTheme() {

        return THEMES[
            getCurrentThemeName()
        ];

    }


    /* =====================================================
       COLOR UTILITIES
       ===================================================== */

    function hexToRgb(hex) {

        if (
            !hex ||
            typeof hex !== "string"
        ) {

            return {
                r: 255,
                g: 255,
                b: 255
            };

        }


        let value =
            hex.replace(
                "#",
                ""
            );


        if (
            value.length === 3
        ) {

            value =
                value
                    .split("")
                    .map(
                        char =>
                            char + char
                    )
                    .join("");

        }


        return {

            r:
                parseInt(
                    value.substring(0, 2),
                    16
                ),

            g:
                parseInt(
                    value.substring(2, 4),
                    16
                ),

            b:
                parseInt(
                    value.substring(4, 6),
                    16
                )

        };

    }


    function rgba(
        color,
        alpha
    ) {

        const rgb =
            hexToRgb(
                color
            );


        return `
            rgba(
                ${rgb.r},
                ${rgb.g},
                ${rgb.b},
                ${alpha}
            )
        `;

    }


    /* =====================================================
       CANVAS
       ===================================================== */

    function createCanvas() {

        canvas =
            document.createElement(
                "canvas"
            );


        canvas.id =
            "qsafeAmbientField";


        canvas.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.appendChild(
            canvas
        );


        ctx =
            canvas.getContext(
                "2d"
            );


        canvas.style.position =
            "fixed";


        canvas.style.inset =
            "0";


        canvas.style.width =
            "100%";


        canvas.style.height =
            "100%";


        canvas.style.pointerEvents =
            "none";


        canvas.style.zIndex =
            "0";


        canvas.style.opacity =
            "0.96";


        document.documentElement.style.background =
            "var(--body-bg)";


        document.body.style.background =
            "transparent";

    }


    /* =====================================================
       RESIZE
       ===================================================== */

    function resizeCanvas() {

        const pixelRatio =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );


        width =
            window.innerWidth;


        height =
            window.innerHeight;


        canvas.width =
            width *
            pixelRatio;


        canvas.height =
            height *
            pixelRatio;


        ctx.setTransform(
            pixelRatio,
            0,
            0,
            pixelRatio,
            0,
            0
        );


        createParticles();

    }


    /* =====================================================
       PARTICLE CREATION
       ===================================================== */

    function createParticles() {

        particles = [];


        const densityFactor =
            Math.sqrt(
                (
                    width *
                    height
                ) /
                (
                    1440 *
                    900
                )
            );


        const count =
            Math.max(
                70,
                Math.round(
                    CONFIG.particleCount *
                    densityFactor
                )
            );


        for (
            let i = 0;
            i < count;
            i++
        ) {

            particles.push({

                x:
                    Math.random() *
                    width,

                y:
                    Math.random() *
                    height,

                vx:
                    (
                        Math.random() -
                        0.5
                    ) *
                    CONFIG.baseSpeed,

                vy:
                    (
                        Math.random() -
                        0.5
                    ) *
                    CONFIG.baseSpeed,

                size:
                    CONFIG.particleMinSize +
                    Math.random() *
                    (
                        CONFIG.particleMaxSize -
                        CONFIG.particleMinSize
                    ),

                opacity:
                    CONFIG.baseOpacity *
                    (
                        0.55 +
                        Math.random() *
                        0.8
                    ),

                phase:
                    Math.random() *
                    Math.PI *
                    2,

                phaseSpeed:
                    0.002 +
                    Math.random() *
                    0.004,

                interaction:
                    0,

                rotation:
                    Math.random() *
                    Math.PI *
                    2,

                rotationSpeed:
                    (
                        Math.random() -
                        0.5
                    ) *
                    0.01,

                pulse:
                    Math.random() *
                    Math.PI *
                    2,

                pulseSpeed:
                    0.008 +
                    Math.random() *
                    0.01,

                glyph:
                    Math.random() > 0.5
                        ? "1"
                        : "0"

            });

        }

    }


    /* =====================================================
       MOUSE
       ===================================================== */

    function updateMousePosition(
        event
    ) {

        mouse.x =
            event.clientX;


        mouse.y =
            event.clientY;


        mouse.active =
            true;

    }


    function mouseLeave() {

        mouse.active =
            false;

    }


    /* =====================================================
       PARTICLE PHYSICS
       ===================================================== */

    function updateParticles() {

        particles.forEach(
            particle => {

                particle.phase +=
                    particle.phaseSpeed;


                particle.pulse +=
                    particle.pulseSpeed;


                particle.rotation +=
                    particle.rotationSpeed;


                /*
                    Natural drifting movement.
                */

                particle.x +=
                    particle.vx;


                particle.y +=
                    particle.vy;


                /*
                    Organic micro-drift.
                */

                particle.x +=
                    Math.sin(
                        particle.phase
                    ) *
                    0.035;


                particle.y +=
                    Math.cos(
                        particle.phase *
                        0.8
                    ) *
                    0.035;


                /*
                    Mouse interaction.
                */

                if (
                    mouse.active
                ) {

                    const dx =
                        particle.x -
                        mouse.x;


                    const dy =
                        particle.y -
                        mouse.y;


                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance <
                        CONFIG.mouseRadius
                    ) {

                        const influence =
                            1 -
                            (
                                distance /
                                CONFIG.mouseRadius
                            );


                        const safeDistance =
                            Math.max(
                                distance,
                                1
                            );


                        /*
                            Push particle away
                            from cursor.
                        */

                        particle.x +=
                            (
                                dx /
                                safeDistance
                            )
                            *
                            influence
                            *
                            CONFIG.mouseForce;


                        particle.y +=
                            (
                                dy /
                                safeDistance
                            )
                            *
                            influence
                            *
                            CONFIG.mouseForce;


                        /*
                            Smooth bulge.
                        */

                        particle.interaction +=
                            (
                                influence -
                                particle.interaction
                            )
                            *
                            0.14;

                    }
                    else {

                        particle.interaction +=
                            (
                                0 -
                                particle.interaction
                            )
                            *
                            0.05;

                    }

                }
                else {

                    particle.interaction +=
                        (
                            0 -
                            particle.interaction
                        )
                        *
                        0.04;

                }


                /*
                    Screen wrapping.
                */

                const margin = 25;


                if (
                    particle.x <
                    -margin
                ) {

                    particle.x =
                        width +
                        margin;

                }


                if (
                    particle.x >
                    width +
                    margin
                ) {

                    particle.x =
                        -margin;

                }


                if (
                    particle.y <
                    -margin
                ) {

                    particle.y =
                        height +
                        margin;

                }


                if (
                    particle.y >
                    height +
                    margin
                ) {

                    particle.y =
                        -margin;

                }

            }
        );

    }


    /* =====================================================
       CONNECTIONS
       ===================================================== */

    function drawConnections(
        theme
    ) {

        for (
            let i = 0;
            i < particles.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < particles.length;
                j++
            ) {

                const a =
                    particles[i];


                const b =
                    particles[j];


                const dx =
                    a.x -
                    b.x;


                const dy =
                    a.y -
                    b.y;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance >
                    CONFIG.maxConnectionDistance
                ) {

                    continue;

                }


                const strength =
                    1 -
                    (
                        distance /
                        CONFIG.maxConnectionDistance
                    );


                let alpha =
                    CONFIG.connectionOpacity *
                    strength;


                /*
                    Mouse makes nearby connections
                    slightly brighter.
                */

                if (
                    mouse.active
                ) {

                    const midpointX =
                        (
                            a.x +
                            b.x
                        ) /
                        2;


                    const midpointY =
                        (
                            a.y +
                            b.y
                        ) /
                        2;


                    const mdx =
                        midpointX -
                        mouse.x;


                    const mdy =
                        midpointY -
                        mouse.y;


                    const mouseDistance =
                        Math.sqrt(
                            mdx * mdx +
                            mdy * mdy
                        );


                    if (
                        mouseDistance <
                        CONFIG.mouseRadius
                    ) {

                        alpha +=
                            (
                                1 -
                                mouseDistance /
                                CONFIG.mouseRadius
                            )
                            *
                            0.08;

                    }

                }


                ctx.lineWidth =
                    theme.lineType === "brutal"
                        ? 1
                        : 0.6;


                ctx.strokeStyle =
                    rgba(
                        theme.primary,
                        alpha
                    );


                ctx.beginPath();


                ctx.moveTo(
                    a.x,
                    a.y
                );


                ctx.lineTo(
                    b.x,
                    b.y
                );


                ctx.stroke();

            }

        }

    }


    /* =====================================================
       QUANTUM PARTICLE
       ===================================================== */

    function drawQuantumParticle(
        particle,
        theme
    ) {

        const pulse =
            (
                Math.sin(
                    particle.pulse
                ) +
                1
            )
            /
            2;


        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                2.8
            )
            +
            pulse *
            0.7;


        ctx.save();


        if (
            particle.interaction >
            0.03
        ) {

            ctx.shadowBlur =
                13 +
                particle.interaction *
                18;

            ctx.shadowColor =
                theme.primary;

        }


        ctx.fillStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.55
                )
            );


        ctx.beginPath();


        ctx.arc(
            particle.x,
            particle.y,
            size,
            0,
            Math.PI * 2
        );


        ctx.fill();


        /*
            Tiny orbit ring.
        */

        if (
            particle.interaction >
            0.08 ||
            pulse >
            0.65
        ) {

            ctx.strokeStyle =
                rgba(
                    theme.secondary,
                    0.24 +
                    particle.interaction *
                    0.5
                );


            ctx.lineWidth =
                0.6;


            ctx.beginPath();


            ctx.ellipse(
                particle.x,
                particle.y,
                size * 2.5,
                size * 0.9,
                particle.rotation,
                0,
                Math.PI * 2
            );


            ctx.stroke();

        }


        ctx.restore();

    }


    /* =====================================================
       CYBER CIRCUIT PARTICLE
       ===================================================== */

    function drawCircuitParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                3
            );


        ctx.save();


        ctx.translate(
            particle.x,
            particle.y
        );


        ctx.rotate(
            Math.PI / 4
        );


        if (
            particle.interaction >
            0.02
        ) {

            ctx.shadowBlur =
                15;

            ctx.shadowColor =
                theme.primary;

        }


        ctx.fillStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.7
                )
            );


        ctx.fillRect(
            -size,
            -size,
            size * 2,
            size * 2
        );


        /*
            Circuit tail.
        */

        ctx.strokeStyle =
            rgba(
                theme.secondary,
                0.35
            );


        ctx.lineWidth =
            0.7;


        ctx.beginPath();


        ctx.moveTo(
            size,
            0
        );


        ctx.lineTo(
            size * 3.5,
            0
        );


        ctx.stroke();


        ctx.restore();

    }


    /* =====================================================
       CLINICAL PARTICLE
       ===================================================== */

    function drawClinicalParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                2.5
            );


        ctx.save();


        if (
            particle.interaction >
            0.03
        ) {

            ctx.shadowBlur =
                12;

            ctx.shadowColor =
                theme.primary;

        }


        /*
            Hexagon.
        */

        ctx.strokeStyle =
            rgba(
                theme.primary,
                particle.opacity +
                particle.interaction *
                0.45
            );


        ctx.lineWidth =
            0.7;


        ctx.beginPath();


        for (
            let i = 0;
            i < 6;
            i++
        ) {

            const angle =
                (
                    Math.PI /
                    3
                )
                *
                i;


            const x =
                particle.x +
                Math.cos(angle) *
                size *
                2.5;


            const y =
                particle.y +
                Math.sin(angle) *
                size *
                2.5;


            if (
                i === 0
            ) {

                ctx.moveTo(
                    x,
                    y
                );

            }
            else {

                ctx.lineTo(
                    x,
                    y
                );

            }

        }


        ctx.closePath();

        ctx.stroke();


        /*
            Medical cross in center.
        */

        ctx.fillStyle =
            rgba(
                theme.secondary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.6
                )
            );


        ctx.fillRect(
            particle.x - size * 0.55,
            particle.y - size * 1.7,
            size * 1.1,
            size * 3.4
        );


        ctx.fillRect(
            particle.x - size * 1.7,
            particle.y - size * 0.55,
            size * 3.4,
            size * 1.1
        );


        ctx.restore();

    }


    /* =====================================================
       THREAT / HAZARD PARTICLE
       ===================================================== */

    function drawHazardParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                3
            );


        ctx.save();


        ctx.translate(
            particle.x,
            particle.y
        );


        if (
            particle.interaction >
            0.02
        ) {

            ctx.shadowBlur =
                16;

            ctx.shadowColor =
                theme.primary;

        }


        /*
            Warning triangle.
        */

        ctx.strokeStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.65
                )
            );


        ctx.lineWidth =
            1;


        ctx.beginPath();


        ctx.moveTo(
            0,
            -size * 3
        );


        ctx.lineTo(
            size * 2.7,
            size * 2.3
        );


        ctx.lineTo(
            -size * 2.7,
            size * 2.3
        );


        ctx.closePath();


        ctx.stroke();


        /*
            Hazard dot.
        */

        ctx.fillStyle =
            rgba(
                theme.secondary,
                0.8
            );


        ctx.beginPath();


        ctx.arc(
            0,
            size * 0.8,
            size * 0.35,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       NEO BRUTAL PARTICLE
       ===================================================== */

    function drawBrutalParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                4
            );


        ctx.save();


        ctx.translate(
            particle.x,
            particle.y
        );


        ctx.rotate(
            particle.rotation
        );


        /*
            No soft glow:
            neo-brutalism uses hard graphic forms.
        */

        ctx.fillStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    0.65 +
                    particle.interaction *
                    0.35
                )
            );


        const mode =
            Math.floor(
                (
                    particle.phase *
                    2
                )
                %
                3
            );


        if (
            mode === 0
        ) {

            /*
                Square.
            */

            ctx.fillRect(
                -size * 2,
                -size * 2,
                size * 4,
                size * 4
            );

        }
        else if (
            mode === 1
        ) {

            /*
                Circle.
            */

            ctx.beginPath();


            ctx.arc(
                0,
                0,
                size * 2.4,
                0,
                Math.PI * 2
            );


            ctx.fill();

        }
        else {

            /*
                Triangle.
            */

            ctx.beginPath();


            ctx.moveTo(
                0,
                -size * 2.8
            );


            ctx.lineTo(
                size * 2.6,
                size * 2.2
            );


            ctx.lineTo(
                -size * 2.6,
                size * 2.2
            );


            ctx.closePath();


            ctx.fill();

        }


        /*
            Hard offset shadow.
        */

        ctx.fillStyle =
            rgba(
                "#111111",
                0.45
            );


        ctx.fillRect(
            size * 1.1,
            size * 1.1,
            size * 1.5,
            size * 1.5
        );


        ctx.restore();

    }


    /* =====================================================
       MIDNIGHT VIOLET CRYSTAL
       ===================================================== */

    function drawCrystalParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                3.2
            );


        ctx.save();


        ctx.translate(
            particle.x,
            particle.y
        );


        ctx.rotate(
            particle.rotation
        );


        if (
            particle.interaction >
            0.02
        ) {

            ctx.shadowBlur =
                17;

            ctx.shadowColor =
                theme.primary;

        }


        ctx.strokeStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.65
                )
            );


        ctx.lineWidth =
            0.8;


        /*
            Four-point crystal.
        */

        ctx.beginPath();


        ctx.moveTo(
            0,
            -size * 3
        );


        ctx.lineTo(
            size * 1.2,
            0
        );


        ctx.lineTo(
            0,
            size * 3
        );


        ctx.lineTo(
            -size * 1.2,
            0
        );


        ctx.closePath();


        ctx.stroke();


        /*
            Inner core.
        */

        ctx.fillStyle =
            rgba(
                theme.secondary,
                0.65
            );


        ctx.beginPath();


        ctx.arc(
            0,
            0,
            size * 0.75,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       ARCTIC PARTICLE
       ===================================================== */

    function drawArcticParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                2.8
            );


        ctx.save();


        if (
            particle.interaction >
            0.02
        ) {

            ctx.shadowBlur =
                12;

            ctx.shadowColor =
                theme.primary;

        }


        ctx.strokeStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.6
                )
            );


        ctx.lineWidth =
            0.7;


        /*
            Six-arm snowflake.
        */

        for (
            let i = 0;
            i < 3;
            i++
        ) {

            const angle =
                i *
                Math.PI /
                3;


            const dx =
                Math.cos(angle) *
                size *
                3;


            const dy =
                Math.sin(angle) *
                size *
                3;


            ctx.beginPath();


            ctx.moveTo(
                particle.x - dx,
                particle.y - dy
            );


            ctx.lineTo(
                particle.x + dx,
                particle.y + dy
            );


            ctx.stroke();

        }


        /*
            Cool center.
        */

        ctx.fillStyle =
            rgba(
                theme.secondary,
                0.65
            );


        ctx.beginPath();


        ctx.arc(
            particle.x,
            particle.y,
            size,
            0,
            Math.PI * 2
        );


        ctx.fill();


        ctx.restore();

    }


    /* =====================================================
       CARBON MATRIX PARTICLE
       ===================================================== */

    function drawMatrixParticle(
        particle,
        theme
    ) {

        const size =
            particle.size *
            (
                1 +
                particle.interaction *
                2.7
            );


        ctx.save();


        ctx.font =
            `${Math.max(
                9,
                size * 4
            )}px Consolas, monospace`;


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        if (
            particle.interaction >
            0.02
        ) {

            ctx.shadowBlur =
                13;

            ctx.shadowColor =
                theme.primary;

        }


        ctx.fillStyle =
            rgba(
                theme.primary,
                Math.min(
                    1,
                    particle.opacity +
                    particle.interaction *
                    0.6
                )
            );


        ctx.fillText(
            particle.glyph,
            particle.x,
            particle.y
        );


        /*
            Tiny square terminal node.
        */

        if (
            particle.interaction >
            0.18
        ) {

            ctx.fillStyle =
                rgba(
                    theme.secondary,
                    0.8
                );


            ctx.fillRect(
                particle.x +
                size * 2,
                particle.y -
                size * 0.5,
                size,
                size
            );

        }


        ctx.restore();

    }


    /* =====================================================
       PARTICLE DISPATCHER
       ===================================================== */

    function drawParticles(
        theme
    ) {

        particles.forEach(
            particle => {

                switch (
                    theme.particleType
                ) {

                    case "quantum":

                        drawQuantumParticle(
                            particle,
                            theme
                        );

                        break;


                    case "circuit":

                        drawCircuitParticle(
                            particle,
                            theme
                        );

                        break;


                    case "clinical":

                        drawClinicalParticle(
                            particle,
                            theme
                        );

                        break;


                    case "hazard":

                        drawHazardParticle(
                            particle,
                            theme
                        );

                        break;


                    case "brutal":

                        drawBrutalParticle(
                            particle,
                            theme
                        );

                        break;


                    case "crystal":

                        drawCrystalParticle(
                            particle,
                            theme
                        );

                        break;


                    case "arctic":

                        drawArcticParticle(
                            particle,
                            theme
                        );

                        break;


                    case "matrix":

                        drawMatrixParticle(
                            particle,
                            theme
                        );

                        break;


                    default:

                        drawQuantumParticle(
                            particle,
                            theme
                        );

                }

            }
        );

    }


    /* =====================================================
       MOUSE FIELD
       ===================================================== */

    function drawMouseField(
        theme
    ) {

        if (
            !mouse.active
        ) {

            return;

        }


        const gradient =
            ctx.createRadialGradient(
                mouse.x,
                mouse.y,
                0,
                mouse.x,
                mouse.y,
                CONFIG.mouseRadius
            );


        gradient.addColorStop(
            0,
            rgba(
                theme.primary,
                0.07
            )
        );


        gradient.addColorStop(
            0.3,
            rgba(
                theme.primary,
                0.025
            )
        );


        gradient.addColorStop(
            1,
            rgba(
                theme.primary,
                0
            )
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();


        ctx.arc(
            mouse.x,
            mouse.y,
            CONFIG.mouseRadius,
            0,
            Math.PI * 2
        );


        ctx.fill();

    }


    /* =====================================================
       ANIMATION
       ===================================================== */

    function animate() {

        const theme =
            getCurrentTheme();


        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        updateParticles();


        drawConnections(
            theme
        );


        drawParticles(
            theme
        );


        drawMouseField(
            theme
        );


        animationId =
            requestAnimationFrame(
                animate
            );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        createCanvas();


        resizeCanvas();


        window.addEventListener(
            "resize",
            resizeCanvas
        );


        window.addEventListener(
            "mousemove",
            updateMousePosition,
            {
                passive: true
            }
        );


        window.addEventListener(
            "mouseleave",
            mouseLeave
        );


        animate();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();

    }

})();