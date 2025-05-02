/*
 *  Oneko.js: https://github.com/adryd325/oneko.js
 *  Pet the cat version: https://github.com/tylxr59/oneko.js
 *  Spicetify version: https://github.com/kyrie25/spicetify-oneko
 */

(async function oneko() {
    const nekoEl = document.createElement("div");
    let nekoPosX = 32,
        nekoPosY = 32,
        mousePosX = 0,
        mousePosY = 0,
        frameCount = 0,
        idleTime = 0,
        idleAnimation = null,
        idleAnimationFrame = 0,
        forceSleep = false,
        grabbing = false,
        grabStop = true,
        nudge = false;

    function parseLocalStorage(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(`oneko:${key}`));
            return typeof value === typeof fallback ? value : fallback;
        } catch (e) {
            console.error(e);
            return fallback;
        }
    }

    const nekoSpeed = 10,
        spriteSets = {
            idle: [[-3, -3]],
            alert: [[-7, -3]],
            scratchSelf: [
                [-5, 0],
                [-6, 0],
                [-7, 0],
            ],
            scratchWallN: [
                [0, 0],
                [0, -1],
            ],
            scratchWallS: [
                [-7, -1],
                [-6, -2],
            ],
            scratchWallE: [
                [-2, -2],
                [-2, -3],
            ],
            scratchWallW: [
                [-4, 0],
                [-4, -1],
            ],
            tired: [[-3, -2]],
            sleeping: [
                [-2, 0],
                [-2, -1],
            ],
            N: [
                [-1, -2],
                [-1, -3],
            ],
            NE: [
                [0, -2],
                [0, -3],
            ],
            E: [
                [-3, 0],
                [-3, -1],
            ],
            SE: [
                [-5, -1],
                [-5, -2],
            ],
            S: [
                [-6, -3],
                [-7, -2],
            ],
            SW: [
                [-5, -3],
                [-6, -1],
            ],
            W: [
                [-4, -2],
                [-4, -3],
            ],
            NW: [
                [-1, 0],
                [-1, -1],
            ],
        };

    function create() {
        variant = parseLocalStorage("variant", "classic");
        const prefersDarkMode =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        kuroNeko = prefersDarkMode ? false : true;

        nekoEl.id = "oneko";
        nekoEl.style.width = "32px";
        nekoEl.style.height = "32px";
        nekoEl.style.position = "fixed";
        // nekoEl.style.pointerEvents = "none";
        nekoEl.style.backgroundImage = `url('https://cdn.nest.rip/uploads/e17c87d3-4f9a-4eb1-b49b-c70144f6910d.png')`;
        nekoEl.style.imageRendering = "pixelated";
        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
        nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";

        document.body.appendChild(nekoEl);

        window.addEventListener("mousemove", (e) => {
            if (forceSleep) return;

            mousePosX = e.clientX;
            mousePosY = e.clientY;
        });

        window.addEventListener("resize", () => {
            if (forceSleep) {
                forceSleep = false;
                sleep();
            }
        });

        // Handle dragging of the cat
        nekoEl.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            grabbing = true;
            let startX = e.clientX;
            let startY = e.clientY;
            let startNekoX = nekoPosX;
            let startNekoY = nekoPosY;
            let grabInterval;

            const mousemove = (e) => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const absDeltaX = Math.abs(deltaX);
                const absDeltaY = Math.abs(deltaY);

                // Scratch in the opposite direction of the drag
                if (absDeltaX > absDeltaY && absDeltaX > 10) {
                    setSprite(
                        deltaX > 0 ? "scratchWallW" : "scratchWallE",
                        frameCount
                    );
                } else if (absDeltaY > absDeltaX && absDeltaY > 10) {
                    setSprite(
                        deltaY > 0 ? "scratchWallN" : "scratchWallS",
                        frameCount
                    );
                }

                if (
                    grabStop ||
                    absDeltaX > 10 ||
                    absDeltaY > 10 ||
                    Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10
                ) {
                    grabStop = false;
                    clearTimeout(grabInterval);
                    grabInterval = setTimeout(() => {
                        grabStop = true;
                        nudge = false;
                        startX = e.clientX;
                        startY = e.clientY;
                        startNekoX = nekoPosX;
                        startNekoY = nekoPosY;
                    }, 150);
                }

                nekoPosX = startNekoX + e.clientX - startX;
                nekoPosY = startNekoY + e.clientY - startY;
                nekoEl.style.left = `${nekoPosX - 16}px`;
                nekoEl.style.top = `${nekoPosY - 16}px`;
            };

            const mouseup = () => {
                grabbing = false;
                nudge = true;
                resetIdleAnimation();
                window.removeEventListener("mousemove", mousemove);
                window.removeEventListener("mouseup", mouseup);
            };

            window.addEventListener("mousemove", mousemove);
            window.addEventListener("mouseup", mouseup);
        });

        nekoEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            kuroNeko = !kuroNeko;
            localStorage.setItem("oneko:kuroneko", kuroNeko);
            nekoEl.style.filter = kuroNeko ? "invert(100%)" : "none";
        });

        window.onekoInterval = setInterval(frame, 100);
    }

    function getSprite(name, frame) {
        return spriteSets[name][frame % spriteSets[name].length];
    }

    function setSprite(name, frame) {
        const sprite = getSprite(name, frame);
        nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32
            }px`;
    }

    function resetIdleAnimation() {
        idleAnimation = null;
        idleAnimationFrame = 0;
    }

    function idle() {
        idleTime += 1;

        // every ~ 20 seconds
        if (
            idleTime > 10 &&
            Math.floor(Math.random() * 200) == 0 &&
            idleAnimation == null
        ) {
            let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
            if (nekoPosX < 32) {
                avalibleIdleAnimations.push("scratchWallW");
            }
            if (nekoPosY < 32) {
                avalibleIdleAnimations.push("scratchWallN");
            }
            if (nekoPosX > window.innerWidth - 32) {
                avalibleIdleAnimations.push("scratchWallE");
            }
            if (nekoPosY > window.innerHeight - 32) {
                avalibleIdleAnimations.push("scratchWallS");
            }
            idleAnimation =
                avalibleIdleAnimations[
                Math.floor(Math.random() * avalibleIdleAnimations.length)
                ];
        }

        if (forceSleep) {
            avalibleIdleAnimations = ["sleeping"];
            idleAnimation = "sleeping";
        }

        switch (idleAnimation) {
            case "sleeping":
                if (idleAnimationFrame < 8 && nudge && forceSleep) {
                    setSprite("idle", 0);
                    break;
                } else if (nudge) {
                    nudge = false;
                    resetIdleAnimation();
                }
                if (idleAnimationFrame < 8) {
                    setSprite("tired", 0);
                    break;
                }
                setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                if (idleAnimationFrame > 192 && !forceSleep) {
                    resetIdleAnimation();
                }
                break;
            case "scratchWallN":
            case "scratchWallS":
            case "scratchWallE":
            case "scratchWallW":
            case "scratchSelf":
                setSprite(idleAnimation, idleAnimationFrame);
                if (idleAnimationFrame > 9) {
                    resetIdleAnimation();
                }
                break;
            default:
                setSprite("idle", 0);
                return;
        }
        idleAnimationFrame += 1;
    }

    // Heart expolsion on Click
    function explodeHearts() {
        console.log("explodeHearts");
        const parent = nekoEl.parentElement;
        const rect = nekoEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < 10; i++) {
            const heart = document.createElement("div");
            heart.className = "heart";
            heart.textContent = "";
            // Add a random offset to the position
            const offsetX = (Math.random() - 0.5) * 50;
            const offsetY = (Math.random() - 0.5) * 50;
            heart.style.left = `${centerX + offsetX - 16}px`;
            heart.style.top = `${centerY + offsetY - 16}px`;
            heart.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360
                }deg)`;
            parent.appendChild(heart);

            // Remove the heart after the animation finishes
            setTimeout(() => {
                parent.removeChild(heart);
            }, 1000);
        }
    }

    const style = document.createElement("style");
    style.innerHTML = `
        @keyframes heartBurst {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
        }
        .heart {
            position: absolute;
            font-size: 2em;
            animation: heartBurst 1s ease-out;
            animation-fill-mode: forwards;
            color:  var(--OnekoHearts);
            filter: var(--OnekoHearts-filter);
        }
        `;

    document.head.appendChild(style);
    nekoEl.addEventListener("click", explodeHearts);

    function frame() {
        frameCount += 1;

        if (grabbing) {
            grabStop && setSprite("alert", 0);
            return;
        }

        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        // Cat has to sleep on top of the progress bar
        if (
            forceSleep &&
            Math.abs(diffY) < nekoSpeed &&
            Math.abs(diffX) < nekoSpeed
        ) {
            // Make the cat sleep exactly on the top of the progress bar
            nekoPosX = mousePosX;
            nekoPosY = mousePosY;
            nekoEl.style.left = `${nekoPosX - 16}px`;
            nekoEl.style.top = `${nekoPosY - 16}px`;

            idle();
            return;
        }

        if ((distance < nekoSpeed || distance < 48) && !forceSleep) {
            idle();
            return;
        }

        idleAnimation = null;
        idleAnimationFrame = 0;

        if (idleTime > 1) {
            setSprite("alert", 0);
            // count down after being alerted before moving
            idleTime = Math.min(idleTime, 7);
            idleTime -= 1;
            return;
        }

        direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";
        setSprite(direction, frameCount);

        nekoPosX -= (diffX / distance) * nekoSpeed;
        nekoPosY -= (diffY / distance) * nekoSpeed;

        nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
        nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
    }

    console.log("OneK0 loaded");
    create();
})();
