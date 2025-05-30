/*
* krstlskll69.github.com
* Copyright (C) 2023-Present, KrstlSkll69/krystalskullofficial (Krystal/Juniper/Macintosh), SerStars and contributors
* SPDX-License-Identifier: AGPL-3.0-or-later
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Encode images to base64
async function encodeBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Data from Lanyard API
let ws = null;
let userData = null;
let previousStatus = null;
let previousActivity = null;

// Discord User ID of the person you want to track
const userId = "929208515883569182";

// Connect to Lanayrd WebSocket
function connectWebSocket(useBackup = false) {
    // Currently using 'SelfHosted' Lanyard instance main can be found @ wss://api.lanyard.rest/socket
    const primaryWss = "wss://lanyard.atums.world/socket";
    // Mohammad needs to update his lanyard instance for now we fall-back to the main
    const backupWss = "wss://api.lanyard.rest/socket";
    // const backupWss = "wss://lanyard.vmohammad.dev/socket";

    ws = new WebSocket(useBackup ? backupWss : primaryWss);

    ws.onopen = () => {
        console.log(
            `WebSocket Connected to ${useBackup ? "backup" : "primary"} server`
        );
        ws.send(
            JSON.stringify({
                op: 2,
                d: { subscribe_to_id: userId },
            })
        );
    };

    ws.onmessage = async ({ data }) => {
        const { op, d } = JSON.parse(data);
        switch (op) {
            case 0: {
                userData = { data: d };
                // await updateClanBadge();
                await updateAvatar();
                await updateAvatarDecoration();
                await updateBadges();

                // Update Status
                if (d.discord_status !== previousStatus) {
                    previousStatus = d.discord_status;
                    const statusIndicator =
                        document.querySelector(".status-indicator");
                    statusIndicator.className = `status-indicator ${d.discord_status}`;
                    console.log("Status updated successfully");
                }

                // Update Activities or Spotify
                if (d.listening_to_spotify) {
                    const activityList =
                        document.getElementById("activities-list");
                    activityList.style.display = "block";
                    activityList.innerHTML = "";

                    const listItem = document.createElement("li");
                    listItem.classList.add("activity-item");

                    const albumArt = d.spotify.album_art_url
                        ? await encodeBase64(d.spotify.album_art_url)
                        : "";

                    listItem.innerHTML = `
                        <div class="activity-large-img" style="display: flex; align-items: center; justify-content: center;">
                            <img src="data:image/png;base64,${albumArt}"
                                alt="Album Cover"
                                style="
                                    width: 80px;
                                    height: 80px;
                                    border-radius: 10px;
                                    margin: 0 15px;
                                    object-fit: cover;
                                    display: ${d.spotify.album_art_url
                            ? "block"
                            : "none"
                        };
                                    ${d.spotify.album_art_url
                            ? "border: solid 0.5px oklch(0.25 0 0);"
                            : ""
                        }
                                ">
                        </div>
                        <div class="activity-text">
                            <h4>Listening to Spotify</h4>
                            <p>${d.spotify.song}</p>
                            <p>by ${d.spotify.artist}</p>
                        </div>`;

                    activityList.appendChild(listItem);
                    console.log("Spotify updated successfully");
                } else {
                    // Regular activity update
                    const validActivities =
                        d?.activities?.filter(
                            (activity) =>
                                !(
                                    activity.id === "custom" &&
                                    activity.type === 4
                                )
                        ) || [];

                    if (
                        JSON.stringify(validActivities[0]) !==
                        JSON.stringify(previousActivity)
                    ) {
                        previousActivity = validActivities[0];
                        await updateActivities();
                    }
                }

                // Please don't remove the lines commented out below
                // Update Avatar Decoration (only if changed)
                // if (d?.discord_user?.avatar_decoration_data) {
                //     await updateAvatarDecoration();
                // }

                // Update Clan Badge (only if changed)
                if (d?.discord_user?.primary_guild) {
                    await updateClanBadge();
                }

                // Update Username (only if changed)
                if (d?.discord_user?.username) {
                    await updateUsername();
                    // Add pronouns update
                    const pronounData = await fetchPronouns(userId);
                    const pronouns = formatPronouns(pronounData);

                    if (pronouns) {
                        let pronounsElement =
                            document.getElementById("pronouns-container");
                        if (!pronounsElement) {
                            pronounsElement = document.createElement("d3");
                            pronounsElement.id = "pronouns-container";
                            pronounsElement.style.cssText =
                                "margin-bottom: -8px; margin-top: 10px; display: block;";
                            const usernameContainer =
                                document.getElementById("username-container");
                            if (usernameContainer) {
                                usernameContainer.parentNode.insertBefore(
                                    pronounsElement,
                                    usernameContainer.nextSibling
                                );
                            }
                        }
                        pronounsElement.innerHTML = `<span>${pronouns}</span>`;
                    }
                }

                // Update Platform Indicator (only if changed)
                if (
                    d?.active_on_discord_web !== undefined ||
                    d?.active_on_discord_desktop !== undefined ||
                    d?.active_on_discord_mobile !== undefined
                ) {
                    await updatePlatformIndicator();
                }

                break;
            }
            case 1: {
                setInterval(
                    () => ws.send(JSON.stringify({ op: 3 })),
                    d.heartbeat_interval
                );
                break;
            }
        }
    };

    ws.onclose = () => {
        if (!useBackup) {
            console.log("Primary WebSocket failed, trying backup...");
            setTimeout(() => connectWebSocket(true), 1000);
        } else {
            console.log("Backup WebSocket failed, retrying in 3s...");
            setTimeout(() => connectWebSocket(false), 3000);
        }
    };

    ws.onerror = (error) => {
        console.error(
            `WebSocket error on ${useBackup ? "backup" : "primary"} server:`,
            error
        );
    };
}

// Initialize with WebSocket only
document.addEventListener("DOMContentLoaded", () => {
    connectWebSocket();
});

// Activity Updater
async function updateActivities() {
    try {
        const activitiesList = document.getElementById("activities-list");

        // Filter out custom status
        const validActivities =
            userData?.data?.activities?.filter(
                (activity) => !(activity.id === "custom" && activity.type === 4)
            ) || [];

        // Hide if no valid activities
        if (validActivities.length === 0) {
            activitiesList.style.display = "none";
            return;
        }

        // Display first valid activity
        const activity = validActivities[0];
        activitiesList.style.display = "block";
        activitiesList.innerHTML = "";

        // Large image
        let largeImageSrc = activity.assets?.large_image
            ? await encodeBase64(
                activity.assets.large_image.startsWith("mp:external/")
                    ? `https://media.discordapp.net/external/${activity.assets.large_image.replace(
                        "mp:external/",
                        ""
                    )}`
                    : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.webp`
            )
            : "";

        // Small image
        let smallImageSrc = activity.assets?.small_image
            ? await encodeBase64(
                activity.assets.small_image.startsWith("mp:external/")
                    ? `https://media.discordapp.net/external/${activity.assets.small_image.replace(
                        "mp:external/",
                        ""
                    )}`
                    : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.small_image}.webp`
            )
            : "";

        const listItem = document.createElement("li");
        listItem.classList.add("activity-item-1");
        listItem.id = "activity-0";

        listItem.innerHTML = `
            <div class="activity-info">
                <div class="activity-large-img">
                    <img src="data:image/png;base64,${largeImageSrc}" alt="${activity.name
            }">
                </div>
                <div class="activity-text">
                    <h4>${activity.name}</h4>
                    <p>${activity.state || ""}</p>
                    <p>${activity.details || ""}</p>
                </div>
            </div>
            <div class="activity-small-img">
                <img src="data:image/png;base64,${smallImageSrc}" alt="${activity.name
            }">
            </div>
        `;
        activitiesList.appendChild(listItem);
        console.log("Activities updated successfully");
    } catch (error) {
        console.error("Error updating activities:", error);
    }
}

// Avatar Decoration Updater
async function updateAvatarDecoration() {
    try {
        let decorationUrl = null;

        // Check if the user has avatar decoration data on Discord
        if (userData?.data?.discord_user?.avatar_decoration_data) {
            const decorationData =
                userData.data.discord_user.avatar_decoration_data;
            decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=64&passthrough=true`;
        } else {
            // Check if the user has avatar decoration data on Decor
            const decorApi = await fetch(
                `https://decor.fieryflames.dev/api/users/${userId}`
            );
            if (decorApi.ok) {
                const decorData = await decorApi.json();
                if (decorData.decorationHash) {
                    decorationUrl = `https://ugc.decor.fieryflames.dev/${decorData.decorationHash}.png?animated=true`;
                }
            }
        }

        // If we have a decoration from either source, update the avatar decoration
        if (decorationUrl) {
            const decorationBase64 = await encodeBase64(decorationUrl);
            let decorationImg = document.getElementById("avatar-decoration");

            if (!decorationImg) {
                decorationImg = document.createElement("img");
                decorationImg.id = "avatar-decoration";
                const profilePicContainer =
                    document.querySelector(".profilePic").parentElement;
                profilePicContainer.style.position = "relative";
                profilePicContainer.appendChild(decorationImg);
            }

            decorationImg.src = `data:image/png;base64,${decorationBase64}`;
            console.log("Avatar decoration updated successfully");
        } else {
            // Remove the decoration if none is found
            const decorationImg = document.getElementById("avatar-decoration");
            if (decorationImg) {
                decorationImg.remove();
            }
            console.log("No avatar decoration found");
        }
    } catch (error) {
        console.error(`Error updating avatar decoration:`, error);
    }
}

async function updateAvatar() {
    try {
        if (!userData?.data?.discord_user?.avatar) {
            console.log("No avatar data found");
            return;
        }

        const avatarHash = userData.data.discord_user.avatar;
        const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}?size=256`;

        const profilePic = document.getElementById("profile-picture");
        if (!profilePic) {
            console.log("Profile picture element not found");
            return;
        }

        // Convert to base64 to prevent CORS issues
        const avatarBase64 = await encodeBase64(avatarUrl);
        profilePic.src = `data:image/png;base64,${avatarBase64}`;
        console.log("Avatar updated successfully");
    } catch (error) {
        console.error("Error updating avatar:", error);
    }
}

// Clan/Guild Badge Updater
async function updateClanBadge() {
    try {
        // Check if the user has clan data
        if (!userData?.data?.discord_user?.primary_guild?.tag) {
            console.log("No Clan/Guild data found");
            return;
        }

        const clan = userData.data.discord_user.primary_guild;
        const clanContainer = document.getElementById("clan-container");
        if (!clanContainer) {
            console.log("Clan/Guild container not found in DOM");
            return;
        }

        const clanUrl = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png?size=16`;
        // In base64 format
        const clanBase64 = await encodeBase64(clanUrl);

        clanContainer.innerHTML = `
            <img src="data:image/png;base64,${clanBase64}" alt="Clan Badge" style="height: 12px; width: 12px;">
            <span style="white-space: nowrap;">${clan.tag}</span>
        `;
        clanContainer.style.display = "inline-flex";
        console.log("Clan/Guild badge updated successfully");
    } catch (error) {
        // Error...
        console.error(`Error updating Clan/Guild badge: ${error.message}`);
    }
}

// Discord Badges Math
const DISCORD_BADGES = {
    // We cannot get the Nitro badges due limitations
    // But you can add an function to check if the user has an animated profile picture and add the Nitro badge
    DISCORD_EMPLOYEE: 1 << 0,
    PARTNERED_SERVER_OWNER: 1 << 1,
    HYPESQUAD_EVENTS: 1 << 2,
    BUGHUNTER_LEVEL_1: 1 << 3,
    HOUSE_BRAVERY: 1 << 6,
    HOUSE_BRILLIANCE: 1 << 7,
    HOUSE_BALANCE: 1 << 8,
    EARLY_SUPPORTER: 1 << 9,
    BUGHUNTER_LEVEL_2: 1 << 14,
    VERIFIED_BOT_DEVELOPER: 1 << 17,
    CERTIFIED_MODERATOR: 1 << 18,
    ACTIVE_DEVELOPER: 1 << 22,
};

// Fetch Discord Badges
const DISCORD_BADGE_DETAILS = {
    // If you're adding more badges, make sure to add them below
    DISCORD_EMPLOYEE: {
        tooltip: "Discord Staff",
        icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
    },
    PARTNERED_SERVER_OWNER: {
        tooltip: "Partnered Server Owner",
        icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png",
    },
    HYPESQUAD_EVENTS: {
        tooltip: "HypeSquad Events",
        icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png",
    },
    HOUSE_BRAVERY: {
        tooltip: "HypeSquad Bravery",
        icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png",
    },
    HOUSE_BRILLIANCE: {
        tooltip: "HypeSquad Brilliance",
        icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png",
    },
    HOUSE_BALANCE: {
        tooltip: "HypeSquad Balance",
        icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png",
    },
    EARLY_SUPPORTER: {
        tooltip: "Early Supporter",
        icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png",
    },
    BUGHUNTER_LEVEL_1: {
        tooltip: "Bug Hunter",
        icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png",
    },
    BUGHUNTER_LEVEL_2: {
        tooltip: "Bug Hunter",
        icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png",
    },
    VERIFIED_BOT_DEVELOPER: {
        tooltip: "Early Verified Bot Developer",
        icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png",
    },
    CERTIFIED_MODERATOR: {
        tooltip: "Moderator Programs Alumni",
        icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png",
    },
    ACTIVE_DEVELOPER: {
        tooltip: "Active Developer",
        icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png",
    },
    // These use Lanyard's KV data to manage these badges
    NITRO: {
        tooltip: "Nitro Subscriber",
        icon: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png",
    },
    QUEST: {
        tooltip: "Completed a Quest",
        icon: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png",
    },
    // Newest version of Orbs discord might be using
    ORBSTWO: {
        tooltip: "Orbs",
        icon: "https://cdn.discordapp.com/emojis/1352008036486610954.png",
    },
    // Include this because why not ~~ SRC: https://youtu.be/cc2-4ci4G84
    CLOWN: {
        tooltip: "A Fucking Clown 🤡",
        icon: "https://cdn.discordapp.com/emojis/1349512970589306902.png",
    },
};

// Fetch Discord Badges and add them to the profile
function fetchDiscordBadges(flags) {
    const badges = [];
    // am lazy to fix this
    // Check Lanyard KV store for additional badges
    if (userData?.data?.kv) {
        if (userData.data.kv.nitro === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                icon: DISCORD_BADGE_DETAILS.NITRO.icon,
                type: "discord",
            });
        }

        // Check for Discord badges
        for (const [flag, bitwise] of Object.entries(DISCORD_BADGES)) {
            if (flags & bitwise) {
                const badge = DISCORD_BADGE_DETAILS[flag];
                badges.push({
                    name: badge.tooltip,
                    tooltip: badge.tooltip,
                    icon: badge.icon,
                    type: "discord",
                });
            }
        }

        if (userData.data.kv.quests === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.QUEST.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.QUEST.tooltip,
                icon: DISCORD_BADGE_DETAILS.QUEST.icon,
                type: "discord",
            });
        }

        if (userData.data.kv.orbs === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.ORBS.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.ORBS.tooltip,
                icon: DISCORD_BADGE_DETAILS.ORBS.icon,
                type: "discord",
            });
        }
        if (userData.data.kv.orbstwo === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.ORBSTWO.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.ORBSTWO.tooltip,
                icon: DISCORD_BADGE_DETAILS.ORBSTWO.icon,
                type: "discord",
            });
        }

        if (userData.data.kv.clown === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.CLOWN.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.CLOWN.tooltip,
                icon: DISCORD_BADGE_DETAILS.CLOWN.icon,
                type: "discord",
            });
        }
    }
    return badges;
}

// Fetch Client Mod badges and add them to the profile
async function fetchBadges() {
    try {
        // Fetch from the RealBadgesAPI (the name is a joke) by @SerStars
        const badgesResponse = await fetch(
            // Temp disable until Badges are fixed
            //`https://therealbadgesapi.serstars.workers.dev/?userid=${userId}`,
            {
                method: "GET",
                mode: "cors",
            }
        );
        const response = await badgesResponse.json();

        let userBadges = [];

        // Handle Discord badges
        if (userData?.data?.discord_user?.public_flags) {
            const discordBadges = fetchDiscordBadges(
                userData.data.discord_user.public_flags
            );
            userBadges.push(...discordBadges);
        }

        // If the response is an array, it means the API is working, fetch and load them
        if (Array.isArray(response)) {
            // Filter out the badges from BadgeVault (if you want to filter out more badges, just add a comma (,) and the badge source name (can be found on the API response))
            const filteredBadges = response.filter(
                (badge) => badge.source !== "badgevault"
            );
            userBadges.push(
                ...filteredBadges.map((badge) => {
                    // You can change the badge names here
                    let tooltip = badge.tooltip;
                    if (
                        badge.source === "equicord" &&
                        badge.name === "Contributor"
                    ) {
                        tooltip = `Equicord: ${badge.tooltip}`;
                    }
                    if (
                        badge.source === "enmity" &&
                        badge.name === "supporter"
                    ) {
                        tooltip = `Enmity: ${badge.tooltip}`;
                    }
                    if (badge.source === "reviewdb" && badge.name === "Donor") {
                        tooltip = `ReviewDB: ${badge.tooltip}`;
                    }
                    if (
                        badge.source === "nekocord" &&
                        badge.name === "Early Public Tester"
                    ) {
                        tooltip = `Nekocord: ${badge.tooltip}`;
                    }

                    return {
                        name: badge.name,
                        tooltip: tooltip,
                        icon: badge.icon,
                        type: badge.source,
                    };
                })
            );
            console.log("Badges successfully loaded");
            return userBadges;
        }

        // Try to fallback if the API fails
        console.log("Badges failed, trying fallback...");
        return await fetchBadgesFallback();
    } catch (error) {
        // Fallback if the API fails
        console.error("Badges failed, using fallback");
        return await fetchBadgesFallback();
    }
}

// The fallback function to fetch badges
async function fetchBadgesFallback() {
    let userBadges = [];

    try {
        // Handle Discord badges
        if (userData?.data?.discord_user?.public_flags) {
            const discordBadges = fetchDiscordBadges(
                userData.data.discord_user.public_flags
            );
            userBadges.push(...discordBadges);
        }

        const apiCalls = [
            {
                promise: fetch("https://badges.vencord.dev/badges.json"),
                handler: async (response) => {
                    const vencordBadges = await response.json();
                    if (
                        vencordBadges[userId] &&
                        Array.isArray(vencordBadges[userId])
                    ) {
                        return vencordBadges[userId].map((badge) => ({
                            name: badge.tooltip,
                            tooltip: badge.tooltip,
                            icon: badge.badge,
                            type: "vencord",
                        }));
                    }
                    return [];
                },
            },
            {
                promise: fetch(
                    "https://raw.githubusercontent.com/Equicord/Equibored/refs/heads/main/badges.json"
                ),
                handler: async (response) => {
                    const equicordBadges = await response.json();
                    if (
                        equicordBadges[userId] &&
                        Array.isArray(equicordBadges[userId])
                    ) {
                        return equicordBadges[userId].map((badge) => ({
                            name: badge.tooltip,
                            tooltip: `${badge.tooltip}`,
                            icon: badge.badge,
                            type: "equicord",
                        }));
                    }
                    return [];
                },
            },
            {
                promise: fetch("https://nekocord.dev/assets/badges.json"),
                handler: async (response) => {
                    const nekocordData = await response.json();
                    const badges = [];
                    if (nekocordData.users?.[userId]?.badges) {
                        nekocordData.users[userId].badges.forEach((badgeId) => {
                            const badge = nekocordData.badges[badgeId];
                            if (badge) {
                                badges.push({
                                    name: badge.name,
                                    tooltip: badge.name,
                                    icon: badge.image,
                                    type: "nekocord",
                                });
                            }
                        });
                    }
                    return badges;
                },
            },
            {
                promise: fetch(
                    `https://globalbadges.equicord.org/users/${userId}`
                ),
                handler: async (response) => {
                    const data = await response.json();
                    const badges = [];

                    if (data?.Enmity?.length > 0) {
                        data.Enmity.forEach((badge) => {
                            badges.push({
                                name: badge,
                                tooltip: `Enmity: ${badge}`,
                                icon: `https://globalbadges.equicord.org/badges/Enmity/${badge}`,
                                type: "enmity",
                            });
                        });
                    }

                    // Handle Equicord string badges
                    if (data?.Equicord?.length > 0) {
                        data.Equicord.forEach((badge) => {
                            if (typeof badge === "string") {
                                badges.push({
                                    name: badge,
                                    tooltip: `Equicord: ${badge}`,
                                    icon: `https://globalbadges.equicord.org/badges/Equicord/${badge}`,
                                    type: "equicord",
                                });
                            }
                        });
                    }
                    return badges;
                },
            },
            {
                promise: fetch(
                    "https://manti.vendicated.dev/api/reviewdb/badges"
                ),
                handler: async (response) => {
                    const reviewDbBadges = await response.json();
                    return reviewDbBadges
                        .filter((badge) => badge.discordID === userId)
                        .map((badge) => ({
                            name: badge.name,
                            tooltip: `ReviewDB: ${badge.name}`,
                            icon: badge.icon,
                            type: "reviewdb",
                        }));
                },
            },
        ];

        const promises = apiCalls.map(async ({ promise, handler }) => {
            try {
                const response = await promise;
                if (!response.ok) return [];
                return await handler(response);
            } catch (error) {
                console.warn(
                    `Failed to fetch badges from ${promise.url}:`,
                    error
                );
                return [];
            }
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
            if (result.status === "fulfilled" && Array.isArray(result.value)) {
                userBadges.push(...result.value);
            }
        });

        return userBadges;
    } catch (error) {
        console.error("Error in badge fallback system:", error);
        return userBadges; // Return whatever badges we managed to collect
    }
}

// Update the badges on the profile
async function updateBadges() {
    try {
        const badges = await fetchBadges();
        if (!badges.length) return;

        let badgesContainer = document.getElementById("badges-container");
        if (!badgesContainer) {
            badgesContainer = document.createElement("div");
            badgesContainer.id = "badges-container";
            badgesContainer.className = "badges-wrapper";
            badgesContainer.style.cssText = `
                display: flex;
                gap: 0.5rem;
                margin: 0.5rem 0;
            `;

            const clanBadge = document.getElementById("clan-container");
            if (clanBadge) {
                clanBadge.parentNode.insertBefore(
                    badgesContainer,
                    clanBadge.nextSibling
                );
            }
        }

        badgesContainer.innerHTML = badges
            .map(
                (badge) => `
            <div class="badge-item">
                <img src="${badge.icon}" alt="${badge.tooltip}" style="width: 20px; height: 20px; border-radius: 50%;">
                <span class="badge-tooltip">${badge.tooltip}</span>
            </div>
        `
            )
            .join("");
    } catch (error) {
        console.error("Error updating badges:", error);
    }
}

// Discord Username
async function updateUsername() {
    try {
        if (!userData?.data?.discord_user?.username) {
            console.log("No username data found");
            return;
        }

        const username = userData.data.discord_user.username;
        const isBot = userData.data.discord_user.bot === true;
        const usernameContainer = document.getElementById("username-container");
        if (!usernameContainer) {
            console.log("Username container not found in DOM");
            return;
        }

        const style = document.createElement("style");
        style.textContent = `
            .bot-badge {
                background-color: oklch(0.58 0.2091 273.85);
                color: white;
                padding: 0px 4px;
                border-radius: 3px;
                font-size: 0.8em;
                margin-left: 4px;
                font-weight: 500;
            }
            .user-indicator {
                color: oklch(0.56 0.0118 261.77);
                font-size: 0.8em;
                display: block;
                text-align: center;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(style);

        usernameContainer.innerHTML = `
            @${username}${isBot ? ' <span class="bot-badge">✔︎ BOT</span>' : ""
            }
            <span class="user-indicator">${isBot ? "" : "(not a bot lol)"
            }</span>
        `;

        // Fetch and add pronouns
        const pronounData = await fetchPronouns(userId);
        const pronouns = formatPronouns(pronounData);

        if (pronouns) {
            let pronounsElement = document.getElementById("pronouns-container");
            if (!pronounsElement) {
                pronounsElement = document.createElement("d3");
                pronounsElement.id = "pronouns-container";
                pronounsElement.style.cssText = `
                    margin-top: 5px;
                    display: flex;
                    justify-content: center;
                    width: 100%;
                `;
                usernameContainer.parentNode.insertBefore(
                    pronounsElement,
                    usernameContainer.nextSibling
                );
            }
            pronounsElement.innerHTML = `<span>${pronouns}</span>`;
        }

        console.log("Username, bot status, and pronouns updated successfully");
    } catch (error) {
        console.error(`Error updating username and pronouns: ${error.message}`);
    }
}

async function updatePlatformIndicator() {
    try {
        const webActive = userData?.data?.active_on_discord_web;
        const desktopActive = userData?.data?.active_on_discord_desktop;
        const mobileActive = userData?.data?.active_on_discord_mobile;
        const discordStatus = userData?.data?.discord_status;

        const platformIndicatorContainer = document.getElementById(
            "platform-indicator-container"
        );
        if (!platformIndicatorContainer) {
            console.log("Platform indicator container not found in DOM");
            return;
        }

        // Hide if status is offline
        if (discordStatus === "offline") {
            platformIndicatorContainer.style.display = "none";
            console.log("Platform indicator hidden due to offline status");
            return;
        }

        // Define status colors
        const statusColors = {
            online: "oklch(0.64 0.1451 150.39)",
            idle: "oklch(0.79 0.1641 71.84)",
            dnd: "oklch(0.63 0.2075 24.57)",
            offline: "oklch(0.59 0.0251 254.48)",
        };

        const statusColor = statusColors[discordStatus] || statusColors.offline;
        let platformIconsHTML = "";

        if (webActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <div style="background-color: ${statusColor}; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <img src="https://cdn.nest.rip/uploads/db693b4d-c036-44ce-95a3-8620d8378b0f.svg"
                            alt="Active on Web"
                            style="height: 16px; width: 16px; filter: brightness(0) invert(1);">
                    </div>
                    <span class="platform-tooltip">Active on Web</span>
                </div>
            `;
        }

        if (desktopActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <div style="background-color: ${statusColor}; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <img src="https://cdn.nest.rip/uploads/01a58e1e-bd87-46e8-b5b0-85540e3d20cb.svg"
                            alt="Active on Desktop"
                            style="height: 16px; width: 16px; filter: brightness(0) invert(1);">
                    </div>
                    <span class="platform-tooltip">Active on Desktop</span>
                </div>
            `;
        }

        if (mobileActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <div style="background-color: ${statusColor}; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <img src="https://cdn.nest.rip/uploads/35a1108e-0c66-4afb-b18d-fbe826e29725.svg"
                            alt="Active on Mobile"
                            style="height: 14px; width: 14px; filter: brightness(0) invert(1);">
                    </div>
                    <span class="platform-tooltip">Active on Mobile</span>
                </div>
            `;
        }

        platformIndicatorContainer.innerHTML = platformIconsHTML;
        platformIndicatorContainer.style.display = "flex";

        console.log("Platform indicator updated successfully");
    } catch (error) {
        console.error("Error updating platform indicator:", error);
    }
}

async function fetchPronouns(userId) {
    try {
        const response = await fetch(
            `https://pronoundb.org/api/v2/lookup?platform=discord&ids=${userId}`
        );
        if (!response.ok) throw new Error("Failed to fetch pronouns");
        const data = await response.json();
        return data[userId];
    } catch (error) {
        console.error("Error fetching pronouns:", error);
        return null;
    }
}

function formatPronouns(pronounData) {
    if (!pronounData?.sets?.en) return null;

    const pronounMap = {
        he: "He/Him",
        it: "It/Its",
        she: "She/Her",
        they: "They/Them",
        any: "Any pronouns",
        ask: "Ask me my pronouns",
        avoid: "Use my name",
        other: "Other pronouns",
    };

    return pronounData.sets.en.map((p) => pronounMap[p] || p).join(", ");
}
