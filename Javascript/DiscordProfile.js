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

// For now this is unused
// PronounDB ID of the person you want to track - https://pronoundb.org/
// const pronounDBId = "";

// TODO: *Maybe* add TimezoneDB - https://git.creations.works/creations/timezoneDB
// https://timezone.creations.works/get?id=<discord_user_id>

// Badge URL for fetching badges
const badgeURL = "https://badges.atums.world/";
let badgesLoaded = false;

// Connect to Lanyard WebSocket
function connectWebSocket(useBackup = false) {
	// Currently using 'SelfHosted' Lanyard instance main can be found @ wss://api.lanyard.rest/socket
	const primaryWss = "wss://lanyard.vmohammad.dev/socket";
	const backupWss = "wss://lanyard.atums.world/socket";

	ws = new WebSocket(useBackup ? backupWss : primaryWss);

	ws.onopen = () => {
		console.log(
			`WebSocket Connected to ${useBackup ? "backup" : "primary"} server`,
		);
		ws.send(
			JSON.stringify({
				op: 2,
				d: { subscribe_to_id: userId },
			}),
		);
	};

	ws.onmessage = async ({ data }) => {
		const { op, d } = JSON.parse(data);
		switch (op) {
			case 0: {
				userData = { data: d };
				// await updateClanBadge();
				if (!badgesLoaded) {
					badgesLoaded = true;
					loadBadges(userId, userData?.data?.kv, {
						targetId: "badges-container",
						serviceOrder: ["discord", "equicord", "reviewdb", "vencord"],
					});
				}
				await updateAvatar();
				await updateAvatarDecoration();

				// Update Status
				if (d.discord_status !== previousStatus) {
					previousStatus = d.discord_status;
					const statusIndicator = document.querySelector(".status-indicator");
					statusIndicator.className = `status-indicator ${d.discord_status}`;
					console.log("Status updated successfully");
				}

				// Update Activities or Spotify
				if (d.listening_to_spotify) {
					const activityList = document.getElementById("activities-list");
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
                                    display: ${d.spotify.album_art_url ? "block" : "none"
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
							(activity) => !(activity.id === "custom" && activity.type === 4),
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
						let pronounsElement = document.getElementById("pronouns-container");
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
									usernameContainer.nextSibling,
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
					d?.active_on_discord_mobile !== undefined ||
					d?.active_on_discord_embedded !== undefined
				) {
					await updatePlatformIndicator();
				}

				break;
			}
			case 1: {
				setInterval(
					() => ws.send(JSON.stringify({ op: 3 })),
					d.heartbeat_interval,
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
			error,
		);
	};
}

// Initialize with WebSocket only
connectWebSocket();

// Activity Updater
async function updateActivities() {
	try {
		const activitiesList = document.getElementById("activities-list");

		// Filter out custom status
		const validActivities =
			userData?.data?.activities?.filter(
				(activity) => !(activity.id === "custom" && activity.type === 4),
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
		const largeImageSrc = activity.assets?.large_image
			? await encodeBase64(
				activity.assets.large_image.startsWith("mp:external/")
					? `https://media.discordapp.net/external/${activity.assets.large_image.replace(
						"mp:external/",
						"",
					)}`
					: `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.webp`,
			)
			: "";

		// Small image
		const smallImageSrc = activity.assets?.small_image
			? await encodeBase64(
				activity.assets.small_image.startsWith("mp:external/")
					? `https://media.discordapp.net/external/${activity.assets.small_image.replace(
						"mp:external/",
						"",
					)}`
					: `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.small_image}.webp`,
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
			const decorationData = userData.data.discord_user.avatar_decoration_data;
			decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationData.asset}.png?size=64&passthrough=true`;
		} else {
			// Check if the user has avatar decoration data on Decor
			const decorApi = await fetch(
				`https://decor.fieryflames.dev/api/users/${userId}`,
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
		console.error("Error updating avatar decoration:", error);
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

const DISCORD_BADGE_DETAILS = {
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

// Badges Updater
async function loadBadges(userId, kv, options = {}) {
	const {
		services = [],
		seperated = true,
		cache = true,
		targetId = "badges-container",
		serviceOrder = [],
	} = options;

	const params = new URLSearchParams();
	if (services.length) params.set("services", services.join(","));
	if (seperated) params.set("seperated", "true");
	if (!cache) params.set("cache", "false");

	const url = `${badgeURL}${userId}?${params.toString()}`;

	try {
		const res = await fetch(url);
		const json = await res.json();

		let badgesByService = {};
		let allBadges = [];

		// Handle API response format
		if (
			json.badges &&
			typeof json.badges === "object" &&
			!Array.isArray(json.badges)
		) {
			badgesByService = json.badges;
			allBadges = Object.values(badgesByService).flat();
		} else if (json.badges && Array.isArray(json.badges)) {
			allBadges = [...json.badges]; // Create a copy
			badgesByService = { all: allBadges };
		} else {
			console.log("No badges found");
			return;
		}

		// Add KV badges if they exist
		if (kv) {
			const kvBadges = [];

			if (kv.quests === "true") {
				kvBadges.push({
					badge: DISCORD_BADGE_DETAILS.QUEST.icon,
					tooltip: DISCORD_BADGE_DETAILS.QUEST.tooltip,
				});
			}

			if (kv.orbs === "true") {
				kvBadges.push({
					badge: DISCORD_BADGE_DETAILS.ORBS.icon,
					tooltip: DISCORD_BADGE_DETAILS.ORBS.tooltip,
				});
			}

			if (kv.orbstwo === "true") {
				kvBadges.push({
					badge: DISCORD_BADGE_DETAILS.ORBSTWO.icon,
					tooltip: DISCORD_BADGE_DETAILS.ORBSTWO.tooltip,
				});
			}

			if (kv.clown === "true") {
				kvBadges.push({
					badge: DISCORD_BADGE_DETAILS.CLOWN.icon,
					tooltip: DISCORD_BADGE_DETAILS.CLOWN.tooltip,
				});
			}

			// Add KV badges to the appropriate service or create discord service
			if (kvBadges.length > 0) {
				if (badgesByService.discord) {
					badgesByService.discord.push(...kvBadges);
				} else if (badgesByService.all) {
					badgesByService.all.unshift(...kvBadges);
				} else {
					badgesByService.discord = kvBadges;
				}
				allBadges.push(...kvBadges);
			}
		}

		if (!allBadges.length) {
			console.log("No badges to display");
			return;
		}

		let badgesContainer = document.getElementById(targetId);
		if (!badgesContainer) {
			badgesContainer = document.createElement("div");
			badgesContainer.id = targetId;
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
					clanBadge.nextSibling,
				);
			}
		}

		const renderedServices = new Set();
		let badgeHTML = "";

		const renderBadges = (badges) => {
			return badges
				.map(
					(badge) => `
                    <div class="badge-item">
                        <img src="${badge.badge}" alt="${badge.tooltip}" style="width: 20px; height: 20px; border-radius: 50%;">
                        <span class="badge-tooltip">${badge.tooltip}</span>
                    </div>
                    `,
				)
				.join("");
		};

		// Render badges in specified service order first
		for (const serviceName of serviceOrder) {
			const badges = badgesByService[serviceName];
			if (Array.isArray(badges) && badges.length) {
				badgeHTML += renderBadges(badges);
				renderedServices.add(serviceName);
			}
		}

		// Render remaining services
		for (const [serviceName, badges] of Object.entries(badgesByService)) {
			if (renderedServices.has(serviceName)) continue;
			if (Array.isArray(badges) && badges.length) {
				badgeHTML += renderBadges(badges);
			}
		}

		badgesContainer.innerHTML = badgeHTML;
		console.log("Badges loaded successfully");
	} catch (err) {
		console.error("Error loading badges:", err);
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
		const discriminator = userData.data.discord_user.discriminator;
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
            ${username}#${discriminator}${isBot ? ' <span class="bot-badge">✔︎ BOT</span>' : ""
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
					usernameContainer.nextSibling,
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
		const consoleActive = userData?.data?.active_on_discord_embedded;
		const discordStatus = userData?.data?.discord_status;

		const platformIndicatorContainer = document.getElementById(
			"platform-indicator-container",
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

		if (consoleActive) {
			platformIconsHTML += `
                <div class="platform-icon">
                    <div style="background-color: ${statusColor}; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <img src="https://cdn.nest.rip/uploads/e36343fb-c0bf-4972-b4c3-295ac8fef408.svg"
                            alt="Active on console"
                            style="height: 14px; width: 14px; filter: brightness(0) invert(1);">
                    </div>
                    <span class="platform-tooltip">Active on console</span>
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
			`https://pronoundb.org/api/v2/lookup?platform=discord&ids=${userId}`,
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
