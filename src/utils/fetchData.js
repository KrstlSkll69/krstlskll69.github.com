const userId = "929208515883569182";

export async function fetchUserData() {
    const userData = {
        badges: [],
        clanName: "",
        clanBadge: "",
        pronouns: "",
        customStatus: "",
        activity: "",
        active_on_discord_web: false,
        active_on_discord_mobile: false,
        active_on_discord_desktop: false,
        active_on_discord_embedded: false,
    };

    try {
        let userBadges = [];

        const lanyardRes = await fetch(`https://lanyard.vmohammad.dev/v1/users/${userId}`);
        if (lanyardRes.ok) {
            const lanyardJson = await lanyardRes.json();
            const lanyardData = lanyardJson?.data;
            const user = lanyardData?.discord_user;
            const clan = user?.primary_guild;
            const clanBadge = `https://cdn.discordapp.com/clan-badges/${clan?.identity_guild_id}/${clan?.badge}.png?size=16`
            const customStatus = lanyardData?.activities?.find((a) => a.type === 4);
            const activity = lanyardData?.activities?.find((a) => a.type !== 4);
            const discordBadges = fetchDiscordBadges(lanyardData);

            userBadges.push(...discordBadges);

            userData.clanBadge = clanBadge;
            userData.clanName = clan?.tag;

            userData.customStatus = customStatus?.state;
            userData.activity = activity?.details ?? activity?.name;

            userData.active_on_discord_web = lanyardData?.active_on_discord_web;
            userData.active_on_discord_mobile = lanyardData?.active_on_discord_mobile;
            userData.active_on_discord_desktop = lanyardData?.active_on_discord_desktop;
            userData.active_on_discord_embedded = lanyardData?.active_on_discord_embedded;

        }

        const badgeRes = await fetch(`https://badges.equicord.org/${userId}?seperated=true&capitalize=true&exclude=badgevault,discord`);
        if (badgeRes.ok) {
            const badgeData = await badgeRes.json();

            if (badgeData?.badges) {
                Object.entries(badgeData.badges).forEach(([type, badgeList]) => {
                    if (Array.isArray(badgeList)) {
                        badgeList.forEach((badge) => {
                            if (badge && badge.badge) {
                                userBadges.push({
                                    name: badge.tooltip || badge.badge,
                                    tooltip: `${type}: ${badge.tooltip}`,
                                    icon: badge.badge,
                                    type,
                                });
                            }
                        });
                    }
                });
            }
        }

        const pronoundbRes = await fetch(`https://pronoundb.org/api/v2/lookup?platform=discord&ids=${userId}`)
        if (pronoundbRes.ok) {
            const pronoundbData = await pronoundbRes.json();
            const pronounData = pronoundbData[userId];
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

            userData.pronouns = pronounData?.sets?.en
                ? pronounData.sets.en.map((p) => pronounMap[p] || p).join(", ")
                : "She/Her, It/Its";
        } else {
            userData.pronouns = "She/Her, It/Its"
        }

        userData.badges = userBadges;

        return userData;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return userData;
    }
}

export async function fetchUserStatus() {
    const userData = {
        status: "",
        avatar: "",
        decor: "",
    };

    try {
        const lanyardResponse = await fetch(`https://lanyard.atums.world/v1/users/${userId}`);
        if (lanyardResponse.ok) {
            const lanyardJson = await lanyardResponse.json();
            const lanyardData = lanyardJson?.data;
            const user = lanyardData?.discord_user;
            const avatar = `https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png?size=240`
            const decorationData = user?.avatar_decoration_data;
            const decor = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData?.asset}.png?size=64&passthrough=true`;

            userData.status = lanyardData?.discord_status || "offline";
            userData.avatar = avatar;

            if (decorationData) {
                userData.decor = decor;
            } else {
                const decorApi = await fetch(`https://decor.fieryflames.dev/api/users/${userId}`);
                if (decorApi.ok) {
                    const decorData = await decorApi.json();
                    if (decorData.decorationHash) {
                        userData.decor = `https://ugc.decor.fieryflames.dev/${decorData.decorationHash}.png?animated=true`;
                    }
                }
            }
        }

        return userData;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return userData;
    }
}

function fetchDiscordBadges(userData) {
    const badges = [];
    const flags = userData?.discord_user?.public_flags;

    if (userData?.kv) {
        if (userData?.kv?.nitro === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                icon: DISCORD_BADGE_DETAILS.NITRO.icon,
                type: "discord",
            });
        }

        if (userData?.discord_user?.avatar?.startsWith("a_")) {
            badges.push({
                name: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.NITRO.tooltip,
                icon: DISCORD_BADGE_DETAILS.NITRO.icon,
            });
        }

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

        if (userData?.kv?.quests === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.QUEST.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.QUEST.tooltip,
                icon: DISCORD_BADGE_DETAILS.QUEST.icon,
                type: "discord",
            });
        }

        if (userData?.kv?.orbstwo === "true") {
            badges.push({
                name: DISCORD_BADGE_DETAILS.ORBS.tooltip,
                tooltip: DISCORD_BADGE_DETAILS.ORBS.tooltip,
                icon: DISCORD_BADGE_DETAILS.ORBS.icon,
                type: "discord",
            });
        }

        if (userData?.kv?.clown === "true") {
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

const DISCORD_BADGES = {
    HOUSE_BRAVERY: 1 << 6,
    ACTIVE_DEVELOPER: 1 << 22,
};

const DISCORD_BADGE_DETAILS = {
    HOUSE_BRAVERY: {
        tooltip: "HypeSquad Bravery",
        icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png",
    },
    ACTIVE_DEVELOPER: {
        tooltip: "Active Developer",
        icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png",
    },
    NITRO: {
        tooltip: "Nitro Subscriber",
        icon: "/assets/images/misc/19beb204-3e6c-4392-964f-d962bf0757fa.png",
    },
    QUEST: {
        tooltip: "Completed a Quest",
        icon: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png",
    },
    ORBS: {
        tooltip: "Orbs",
        icon: "https://cdn.discordapp.com/emojis/1352008036486610954.png",
    },
    CLOWN: {
        tooltip: "A Fucking Clown 🤡",
        icon: "https://cdn.discordapp.com/emojis/1349512970589306902.png",
    },
};
