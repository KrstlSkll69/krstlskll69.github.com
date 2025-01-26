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
                userData = d;
                
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
        const validActivities = userData?.activities?.filter(
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
        listItem.classList.add('activity-item');
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
        if (userData?.discord_user?.avatar_decoration_data) {
            const decorationUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${userData.discord_user.avatar_decoration_data.asset}.png?size=64&passthrough=true`;
            const decorationBase64 = await encodeBase64(decorationUrl);
            
            let decorationImg = document.getElementById('avatar-decoration');
            if (!decorationImg) {
                decorationImg = document.createElement('img');
                decorationImg.id = 'avatar-decoration';
                decorationImg.alt = 'Avatar Decoration';
                decorationImg.className = 'hover-opacity transition';
                document.querySelector('.profilePic').parentElement.appendChild(decorationImg);
            }
            
            decorationImg.src = `data:image/png;base64,${decorationBase64}`;
        }
    } catch (error) {
        console.error('Error updating avatar decoration:', error);
    }
}