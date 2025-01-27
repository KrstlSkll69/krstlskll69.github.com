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

let ws = null;
let userData = null;
let previousStatus = null;
let previousActivity = null;

const userId = "929208515883569182";

function connectWebSocket() {
    ws = new WebSocket("wss://api.lanyard.rest/socket");

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
                await updateClanBadge();
                await updateAvatarDecoration();
                await updateBadges();
                
                // Update Status
                if (d.discord_status !== previousStatus) {
                    previousStatus = d.discord_status;
                    const statusIndicator = document.querySelector('.status-indicator');
                    statusIndicator.className = `status-indicator status-${d.discord_status}`;
                }

                // Update Activities or Spotify
                if (d.listening_to_spotify) {
                    const activityList = document.getElementById('activities-list');
                    activityList.style.display = 'block';
                    activityList.innerHTML = '';

                    const listItem = document.createElement('li');
                    listItem.classList.add('activity-item');

                    const albumArt = d.spotify.album_art_url ? 
                        await encodeBase64(d.spotify.album_art_url) : 
                        await encodeBase64('https://lanyard-profile-readme.vercel.app/assets/unknown.png');

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
                                    ${!d.spotify.album_art_url ? 'filter: invert(100);' : ''} 
                                    ${d.spotify.album_art_url ? 'border: solid 0.5px #222;' : ''}
                                ">
                        </div>
                        <div class="activity-text">
                            <h4>Listening to Spotify</h4>
                            <p>${d.spotify.song}</p>
                            <p>by ${d.spotify.artist}</p>
                        </div>`;

                    activityList.appendChild(listItem);
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
                if (d?.data?.discord_user?.clan) {
                    await updateClanBadge();
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

        let largeImageSrc = activity.assets?.large_image
            ? await encodeBase64(
                activity.assets.large_image.startsWith("mp:external/")
                    ? `https://media.discordapp.net/external/${activity.assets.large_image.replace("mp:external/", "")}`
                    : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.webp`
            )
            : await encodeBase64('https://lanyard-profile-readme.vercel.app/assets/unknown.png');
        
        let smallImageSrc = activity.assets?.small_image
            ? await encodeBase64(
                activity.assets.small_image.startsWith("mp:external/")
                ? `https://media.discordapp.net/external/${activity.assets.small_image.replace("mp:external/", "")}`
                : `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.small_image}.webp`
            )
            : await encodeBase64('https://lanyard-profile-readme.vercel.app/assets/unknown.png');

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
    } catch (error) {
        console.error('Error updating activities:', error);
    }
}

async function updateAvatarDecoration() {
    try {
        if (userData?.data?.discord_user?.avatar_decoration_data) {
            const decorationData = userData.data.discord_user.avatar_decoration_data;
            const decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=64&passthrough=true`;            
            const decorationBase64 = await encodeBase64(decorationUrl);

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
            
            decorationImg.src = `data:image/png;base64,${decorationBase64}`;
            console.log('Avatar decoration updated successfully');
        } else {
            console.log('No avatar decoration data found');
        }
    } catch (error) {
        console.error('Error updating avatar decoration:', error);

    }
}

async function updateClanBadge() {
    try {        
        // Check correct data
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
        const clanBase64 = await encodeBase64(clanUrl);
        
        clanContainer.innerHTML = `
            <img src="data:image/png;base64,${clanBase64}" alt="Clan Badge" style="height: 12px; width: 12px;">
            <span style="white-space: nowrap;">${clan.tag}</span>
        `;
        clanContainer.style.display = 'inline-flex';
        console.log('Clan badge updated successfully');
    } catch (error) {
        console.error(`Error updating clan badge: ${error.message}`);
    }
}

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

async function fetchBadges() {
    try {
        const [equicordResponse, vencordResponse, nekocordResponse, clientModBadgesApiResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/Equicord/Equibored/refs/heads/main/badges.json'),
            fetch('https://badges.vencord.dev/badges.json'),
            fetch('https://nekocord.dev/assets/badges.json'),
            // We're using the fork made by Equicord, you can find the original repository @ https://api.domi-btnr.dev/clientmodbadges
            fetch(`https://globalbadges.equicord.fyi/users/${userId}`)
        ]);

        let userBadges = [];

        // Handle Discord badges
        if (userData?.data?.discord_user?.public_flags) {
            const discordBadges = fetchDiscordBadges(userData.data.discord_user.public_flags);
            userBadges.push(...discordBadges);
        }

        // Handle Vencord badges
        const vencordBadges = await vencordResponse.json();
        if (vencordBadges[userId] && Array.isArray(vencordBadges[userId])) {
            userBadges.push(...vencordBadges[userId].map(badge => ({
                name: badge.tooltip,
                tooltip: badge.tooltip,
                icon: badge.badge,
                type: 'vencord'
            })));
        }

        // Handle Equicord badges
        const equicordBadges = await equicordResponse.json();
        if (equicordBadges[userId] && Array.isArray(equicordBadges[userId])) {
            userBadges.push(...equicordBadges[userId].map(badge => ({
                name: badge.tooltip,
                tooltip: badge.tooltip,
                icon: badge.badge,
                type: 'equicord'
            })));
        }

        // Handle Nekocord badges
        const nekocordData = await nekocordResponse.json();
        if (nekocordData.users?.[userId]?.badges) {
            const userNekoBadges = nekocordData.users[userId].badges;
            const nekoBadges = nekocordData.badges;
            
            userNekoBadges.forEach(badgeId => {
                const badge = nekoBadges[badgeId];
                if (badge) {
                    userBadges.push({
                        name: badge.name,
                        tooltip: badge.name,
                        icon: badge.image,
                        type: 'nekocord'
                    });
                }
            });
        }

        // Handle ClientModBadges-API badges
        const clientModBadgesApiData = await clientModBadgesApiResponse.json();

        // Handle Enmity badges
        if (clientModBadgesApiData?.Enmity?.length > 0) {
            clientModBadgesApiData.Enmity.forEach(badge => {
                userBadges.push({
                    name: badge,
                    tooltip: `Enmity: ${badge}`,
                    icon: `https://globalbadges.equicord.fyi/badges/Enmity/${badge}`,
                    type: 'enmity'
                });
            });
        }

        // Handle Equicord string badges
        if (clientModBadgesApiData?.Equicord?.length > 0) {
            clientModBadgesApiData.Equicord.forEach(badge => {
                if (typeof badge === 'string') {
                    userBadges.push({
                        name: badge,
                        tooltip: `Equicord: ${badge}`,
                        icon: `https://globalbadges.equicord.fyi/badges/Equicord/${badge}`,
                        type: 'equicord'
                    });
                }
            });
        }

        // Handle BadgeVault badges
        // You can change BadgeVault to Vencord or any other client mod that's supported @ https://github.com/Equicord/ClientModBadges-API?tab=readme-ov-file#supported-client-mods just make sure it's in the right format
        // if (clientModBadgesApiData?.BadgeVault?.length > 0) {
        //     clientModBadgesApiData.BadgeVault.forEach(badge => {
        //         userBadges.push({
        //             name: badge.name,
        //             tooltip: badge.name,
        //             icon:badge.badge,
        //             type: 'badgevault'
        //         });
        //     });
        // }

        return userBadges;
    } catch (error) {
        console.error('Error fetching badges:', error);
        return [];
    }
}

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