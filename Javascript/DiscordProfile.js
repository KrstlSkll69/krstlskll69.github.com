// Encode images to base64
async function encodeBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
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
function connectWebSocket() {
    // Currently using 'SelfHosted' Lanyard instance main can be found @ wss://api.lanyard.rest/socket
    ws = new WebSocket("wss://lanyard.vmohammad.dev/socket");

    ws.onopen = () => {
        console.log("WebSocket Connected");
        ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: userId }
        }));
    };

    ws.onmessage = async ({ data }) => {
        const { op, d } = JSON.parse(data);
        switch (op) {
            case 0: {
                userData = { data: d };
                // await updateClanBadge();
                // await updateAvatarDecoration();
                await updateBadges();
                
                // Update Status
                if (d.discord_status !== previousStatus) {
                    previousStatus = d.discord_status;
                    const statusIndicator = document.querySelector('.status-indicator');
                    statusIndicator.className = `status-indicator status-${d.discord_status}`;
                    console.log('Status updated successfully');
                }

                // Update Activities or Spotify
                if (d.listening_to_spotify) {
                    const activityList = document.getElementById('activities-list');
                    activityList.style.display = 'block';
                    activityList.innerHTML = '';

                    const listItem = document.createElement('li');
                    listItem.classList.add('activity-item');

                    const albumArt = d.spotify.album_art_url ? 
                        await encodeBase64(d.spotify.album_art_url) : '';

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
                                    display: ${d.spotify.album_art_url ? 'block' : 'none'};
                                    ${d.spotify.album_art_url ? 'border: solid 0.5px #222;' : ''}
                                ">
                        </div>
                        <div class="activity-text">
                            <h4>Listening to Spotify</h4>
                            <p>${d.spotify.song}</p>
                            <p>by ${d.spotify.artist}</p>
                        </div>`;

                    activityList.appendChild(listItem);
                    console.log('Spotify updated successfully');
                } else {
                    // Regular activity update
                    const validActivities = d?.activities?.filter(
                        activity => !(activity.id === "custom" && activity.type === 4)
                    ) || [];
                    
                    if (JSON.stringify(validActivities[0]) !== JSON.stringify(previousActivity)) {
                        previousActivity = validActivities[0];
                        await updateActivities();
                    }
                }

                // Update Avatar Decoration (only if changed)
                if (d?.discord_user?.avatar_decoration_data) {
                    await updateAvatarDecoration();
                }

                // Update Clan Badge (only if changed)
                if (d?.discord_user?.clan) {
                    await updateClanBadge();
                }

                // Update Username (only if changed)
                if (d?.discord_user?.username) {
                    await updateUsername();
                }

                // Update Platform Indicator (only if changed)
                if (d?.active_on_discord_web !== undefined || d?.active_on_discord_desktop !== undefined || d?.active_on_discord_mobile !== undefined) {
                    await updatePlatformIndicator();
                }

                break;
            }
            case 1: {
                setInterval(() => ws.send(JSON.stringify({ op: 3 })), d.heartbeat_interval);
                break;
            }
        }
    };

    ws.onclose = () => setTimeout(connectWebSocket, 3000);
    ws.onerror = (error) => console.error('WebSocket error:', error);
}

// Initialize with WebSocket only
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
});

// Activity Updater
async function updateActivities() {
    try {
        const activitiesList = document.getElementById('activities-list');
        
        // Filter out custom status
        const validActivities = userData?.data?.activities?.filter(
            activity => !(activity.id === "custom" && activity.type === 4)
        ) || [];

        // Hide if no valid activities
        if (validActivities.length === 0) {
            activitiesList.style.display = 'none';
            return;
        }

        // Display first valid activity
        const activity = validActivities[0];
        activitiesList.style.display = 'block';
        activitiesList.innerHTML = '';

        // Large image
        let largeImageSrc = activity.assets?.large_image
            ? await encodeBase64(
                activity.assets.large_image.startsWith("mp:external/")
                    ? `https://media.discordapp.net/external/${activity.assets.large_image.replace("mp:external/", "")}`
                    : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.webp`
            )
            : '';
        
        // Small image
        let smallImageSrc = activity.assets?.small_image
            ? await encodeBase64(
                activity.assets.small_image.startsWith("mp:external/")
                ? `https://media.discordapp.net/external/${activity.assets.small_image.replace("mp:external/", "")}`
                : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.small_image}.webp`
            )
            : '';

        const listItem = document.createElement('li');
        listItem.classList.add('activity-item-1');
        listItem.id = 'activity-0';

        listItem.innerHTML = `
            <div class="activity-info">
                <div class="activity-large-img">
                    <img src="data:image/png;base64,${largeImageSrc}" alt="${activity.name}">
                </div>
                <div class="activity-text">
                    <h4>${activity.name}</h4>
                    <p>${activity.state || ''}</p>
                    <p>${activity.details || ''}</p>
                </div>
            </div>
            <div class="activity-small-img">
                <img src="data:image/png;base64,${smallImageSrc}" alt="${activity.name}">
            </div>
        `;
        activitiesList.appendChild(listItem);
        console.log('Activities updated successfully');
    } catch (error) {
        console.error('Error updating activities:', error);
    }
}

// Avatar Decoration Updater
async function updateAvatarDecoration() {
    try {
        // Check if the user has avatar decoration data
        if (userData?.data?.discord_user?.avatar_decoration_data) {
            const decorationData = userData.data.discord_user.avatar_decoration_data;
            const decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=64&passthrough=true`;            
            const decorationBase64 = await encodeBase64(decorationUrl);

            // Add the decoration image to the profile picture
            let decorationImg = document.getElementById('avatar-decoration');
            if (!decorationImg) {
                decorationImg = document.createElement('img');
                decorationImg.id = 'avatar-decoration';
                decorationImg.alt = 'Avatar Decoration';
                decorationImg.style.cssText = `
                    display: block;
                    width: fill;
                    height: fill;
                    position: absolute;
                    z-index: 2;
                    pointer-events: none;
                `;
                document.querySelector('.profilePic').parentElement.appendChild(decorationImg);
            }
            // In base64 format
            decorationImg.src = `data:image/png;base64,${decorationBase64}`;
            console.log('Avatar decoration updated successfully');
        } else {
            // If there's no avatar decoration data, don't do anything
            console.log('No avatar decoration data found');
        }
    } catch (error) {
        // Error...
        console.error('Error updating avatar decoration:', error);

    }
}

// Clan Badge Updater
async function updateClanBadge() {
    try {        
        // Check if the user has clan data
        if (!userData?.data?.discord_user?.clan?.tag) {
            console.log('No clan data found');
            return;
        }

        const clan = userData.data.discord_user.clan;
        const clanContainer = document.getElementById('clan-container');
        if (!clanContainer) {
            console.log('Clan container not found in DOM');
            return;
        }

        const clanUrl = `https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png?size=16`;        
        // In base64 format
        const clanBase64 = await encodeBase64(clanUrl);
        
        clanContainer.innerHTML = `
            <img src="data:image/png;base64,${clanBase64}" alt="Clan Badge" style="height: 12px; width: 12px;">
            <span style="white-space: nowrap;">${clan.tag}</span>
        `;
        clanContainer.style.display = 'inline-flex';
        console.log('Clan badge updated successfully');
    } catch (error) {
        // Error...
        console.error(`Error updating clan badge: ${error.message}`);
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
    ACTIVE_DEVELOPER: 1 << 22
};

// Fetch Discord Badges
const DISCORD_BADGE_DETAILS = {
    // If you're adding more badges, make sure to add them below
    DISCORD_EMPLOYEE: {
        tooltip: "Discord Staff",
        icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png"
    },
    PARTNERED_SERVER_OWNER: {
        tooltip: "Partnered Server Owner",
        icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png"
    },
    HYPESQUAD_EVENTS: {
        tooltip: "HypeSquad Events",
        icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png"
    },
    HOUSE_BRAVERY: {
        tooltip: "HypeSquad Bravery",
        icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png"
    },
    HOUSE_BRILLIANCE: {
        tooltip: "HypeSquad Brilliance",
        icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png"
    },
    HOUSE_BALANCE: {
        tooltip: "HypeSquad Balance",
        icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png"
    },
    EARLY_SUPPORTER: {
        tooltip: "Early Supporter",
        icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png"
    },
    BUGHUNTER_LEVEL_1: {
        tooltip: "Bug Hunter",
        icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png"
    },
    BUGHUNTER_LEVEL_2: {
        tooltip: "Bug Hunter",
        icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png"
    },
    VERIFIED_BOT_DEVELOPER: {
        tooltip: "Early Verified Bot Developer",
        icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png"
    },
    CERTIFIED_MODERATOR: {
        tooltip: "Moderator Programs Alumni",
        icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png"
    },
    ACTIVE_DEVELOPER: {
        tooltip: "Active Developer",
        icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png"
    }
};

// Fetch Discord Badges and add them to the profile
function fetchDiscordBadges(flags) {
    const badges = [];
    for (const [flag, bitwise] of Object.entries(DISCORD_BADGES)) {
        if (flags & bitwise) {
            const badge = DISCORD_BADGE_DETAILS[flag];
            badges.push({
                name: badge.tooltip,
                tooltip: badge.tooltip,
                icon: badge.icon,
                type: 'discord'
            });
        }
    }
    return badges;
}

// Fetch Client Mod badges and add them to the profile
async function fetchBadges() {
    try {
        // Fetch from the RealBadgesAPI (the name is a joke) by @SerStars
        const badgesResponse = await fetch(`https://therealbadgesapi.serstars.workers.dev/?userid=${userId}`);
        const response = await badgesResponse.json();
        
        let userBadges = [];

        // Handle Discord badges
        if (userData?.data?.discord_user?.public_flags) {
            const discordBadges = fetchDiscordBadges(userData.data.discord_user.public_flags);
            userBadges.push(...discordBadges);
        }

        // If the response is an array, it means the API is working, fetch and load them
        if (Array.isArray(response)) {
            // Filter out the badges from BadgeVault (if you want to filter out more badges, just add a comma (,) and the badge source name (can be found on the API response))
            const filteredBadges = response.filter(badge => badge.source !== 'badgevault');
            userBadges.push(...filteredBadges.map(badge => {
                // You can change the badge names here
                let tooltip = badge.tooltip;
                if (badge.source === 'equicord' && badge.name === 'Contributor') {
                    tooltip = `Equicord: ${badge.tooltip}`;
                }
                if (badge.source === 'enmity' && badge.name === 'supporter') {
                    tooltip = `Enmity: ${badge.tooltip}`;
                }
                if (badge.source === 'reviewdb' && badge.name === 'Donor') {
                    tooltip = `ReviewDB: ${badge.tooltip}`;
                }

                return {
                    name: badge.name,
                    tooltip: tooltip,
                    icon: badge.icon,
                    type: badge.source
                };
            }));
            console.log('Badges successfully loaded');
            return userBadges;
        }

        // Try to fallback if the API fails
        console.log('Badges failed, trying fallback...');
        return await fetchBadgesFallback();
    } catch (error) {
        // Fallback if the API fails
        console.error('Badges failed, using fallback');
        return await fetchBadgesFallback();
    }
}

// The fallback function to fetch badges
async function fetchBadgesFallback() {
    let userBadges = [];

    try {
        // Handle Discord badges
        if (userData?.data?.discord_user?.public_flags) {
            const discordBadges = fetchDiscordBadges(userData.data.discord_user.public_flags);
            userBadges.push(...discordBadges);
        }

        const apiCalls = [
            {
                promise: fetch('https://badges.vencord.dev/badges.json'),
                handler: async (response) => {
                    const vencordBadges = await response.json();
                    if (vencordBadges[userId] && Array.isArray(vencordBadges[userId])) {
                        return vencordBadges[userId].map(badge => ({
                            name: badge.tooltip,
                            tooltip: badge.tooltip,
                            icon: badge.badge,
                            type: 'vencord'
                        }));
                    }
                    return [];
                }
            },
            {
                promise: fetch('https://raw.githubusercontent.com/Equicord/Equibored/refs/heads/main/badges.json'),
                handler: async (response) => {
                    const equicordBadges = await response.json();
                    if (equicordBadges[userId] && Array.isArray(equicordBadges[userId])) {
                        return equicordBadges[userId].map(badge => ({
                            name: badge.tooltip,
                            tooltip: `Equicord: ${badge.tooltip}`,
                            icon: badge.badge,
                            type: 'equicord'
                        }));
                    }
                    return [];
                }
            },
            {
                promise: fetch('https://nekocord.dev/assets/badges.json'),
                handler: async (response) => {
                    const nekocordData = await response.json();
                    const badges = [];
                    if (nekocordData.users?.[userId]?.badges) {
                        nekocordData.users[userId].badges.forEach(badgeId => {
                            const badge = nekocordData.badges[badgeId];
                            if (badge) {
                                badges.push({
                                    name: badge.name,
                                    tooltip: badge.name,
                                    icon: badge.image,
                                    type: 'nekocord'
                                });
                            }
                        });
                    }
                    return badges;
                }
            },
            {
                promise: fetch(`https://globalbadges.equicord.fyi/users/${userId}`),
                handler: async (response) => {
                    const data = await response.json();
                    const badges = [];
                    
                    if (data?.Enmity?.length > 0) {
                        data.Enmity.forEach(badge => {
                            badges.push({
                                name: badge,
                                tooltip: `Enmity: ${badge}`,
                                icon: `https://globalbadges.equicord.fyi/badges/Enmity/${badge}`,
                                type: 'enmity'
                            });
                        });
                    }

                    // Handle Equicord string badges
                    if (data?.Equicord?.length > 0) {
                        data.Equicord.forEach(badge => {
                            if (typeof badge === 'string') {
                                badges.push({
                                    name: badge,
                                    tooltip: `Equicord: ${badge}`,
                                    icon: `https://globalbadges.equicord.fyi/badges/Equicord/${badge}`,
                                    type: 'equicord'
                                });
                            }
                        });
                    }
                    return badges;
                }
            },
            {
                promise: fetch('https://manti.vendicated.dev/api/reviewdb/badges'),
                handler: async (response) => {
                    const reviewDbBadges = await response.json();
                    return reviewDbBadges
                        .filter(badge => badge.discordID === userId)
                        .map(badge => ({
                            name: badge.name,
                            tooltip: `ReviewDB: ${badge.name}`,
                            icon: badge.icon,
                            type: 'reviewdb'
                        }));
                }
            }
        ];

        const promises = apiCalls.map(async ({ promise, handler }) => {
            try {
                const response = await promise;
                if (!response.ok) return [];
                return await handler(response);
            } catch (error) {
                console.warn(`Failed to fetch badges from ${promise.url}:`, error);
                return [];
            }
        });

        const results = await Promise.allSettled(promises);
        results.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                userBadges.push(...result.value);
            }
        });

        return userBadges;
    } catch (error) {
        console.error('Error in badge fallback system:', error);
        return userBadges; // Return whatever badges we managed to collect
    }
}

// Update the badges on the profile
async function updateBadges() {
    try {
        const badges = await fetchBadges();
        if (!badges.length) return;

        let badgesContainer = document.getElementById('badges-container');
        if (!badgesContainer) {
            badgesContainer = document.createElement('div');
            badgesContainer.id = 'badges-container';
            badgesContainer.className = 'badges-wrapper';
            badgesContainer.style.cssText = `
                display: flex;
                gap: 0.5rem;
                margin: 0.5rem 0;
            `;
            
            const clanBadge = document.getElementById('clan-container');
            if (clanBadge) {
                clanBadge.parentNode.insertBefore(badgesContainer, clanBadge.nextSibling);
            }
        }

        badgesContainer.innerHTML = badges.map(badge => `
            <div class="badge-item">
                <img src="${badge.icon}" alt="${badge.tooltip}" style="width: 20px; height: 20px; border-radius: 50%;">
                <span class="badge-tooltip">${badge.tooltip}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error updating badges:', error);
    }
}

// Discord Username
async function updateUsername() {
    try {
        if (!userData?.data?.discord_user?.username) {
            console.log('No username data found');
            return;
        }

        const username = userData.data.discord_user.username;
        const usernameContainer = document.getElementById('username-container');
        if (!usernameContainer) {
            console.log('Username container not found in DOM');
            return;
        }

        usernameContainer.textContent = `@${username}`;
        console.log('Username updated successfully');
    } catch (error) {
        // Error...
        console.error(`Error updating username: ${error.message}`);
    }
}

async function updatePlatformIndicator() {
    try {
        const webActive = userData?.data?.active_on_discord_web;
        const desktopActive = userData?.data?.active_on_discord_desktop;
        const mobileActive = userData?.data?.active_on_discord_mobile;
        const discordStatus = userData?.data?.discord_status;

        const platformIndicatorContainer = document.getElementById('platform-indicator-container');
        if (!platformIndicatorContainer) {
            console.log('Platform indicator container not found in DOM');
            return;
        }

        // Hide if status is offline
        if (discordStatus === 'offline') {
            platformIndicatorContainer.style.display = 'none';
            console.log('Platform indicator hidden due to offline status');
            return;
        }

        let platformIconsHTML = '';

        if (webActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <img src="https://cdn.nest.rip/uploads/db693b4d-c036-44ce-95a3-8620d8378b0f.svg" alt="Active on Web" style="height: 20px; width: 20px; filter: invert(1);">
                    <span class="platform-tooltip">Active on Web</span>
                </div>
            `;
        }

        if (desktopActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <img src="https://cdn.nest.rip/uploads/01a58e1e-bd87-46e8-b5b0-85540e3d20cb.svg" alt="Active on Desktop" style="height: 20px; width: 20px; filter: invert(1);">
                    <span class="platform-tooltip">Active on Desktop</span>
                </div>
            `;
        }

        if (mobileActive) {
            platformIconsHTML += `
                <div class="platform-icon">
                    <img src="https://cdn.nest.rip/uploads/35a1108e-0c66-4afb-b18d-fbe826e29725.svg" alt="Active on Mobile" style="height: 17.5px; width: 17.5px; filter: invert(1);">
                    <span class="platform-tooltip">Active on Mobile</span>
                </div>
            `;
        }

        platformIndicatorContainer.innerHTML = platformIconsHTML;
        platformIndicatorContainer.style.display = 'flex';
        console.log('Platform indicator updated successfully');
    } catch (error) {
        console.error('Error updating platform indicator:', error);
    }
}
