var client_id = 'd882d791766e4a32969c10c265c57337';
var client_secret = '39274d1fbb84487a9e821797e310b5b1';

var fullscreen = false;

window.addEventListener('load', () => {
    addButton();
    addOverlay();
});

function addOverlay() {
    fetch(chrome.runtime.getURL('/src/html/fsView.html'))
        .then((r) => r.text())
        .then((html) => {
            const overlay = document.createElement('div');
            overlay.innerHTML = html;
            overlay.className = 'fs-overlay-container';
            overlay.style.top = window.innerHeight + 'px';

            //addOverlayListeners();

            document.body.appendChild(overlay);
        });
}

function addButton() {
    fetch(chrome.runtime.getURL('/src/html/toggleButton.html'))
        .then((r) => r.text())
        .then((html) => {
            const button = document.createElement('div');
            button.innerHTML = html;
            button.addEventListener('click', toggleFullscreen);

            let container = document.querySelector('div[data-testid="now-playing-widget"]');
            const waitForBar = setInterval(() => {
                log('Waiting...');
                if (container === null) {
                    container = document.querySelector('div[data-testid="now-playing-widget"]');
                } else {
                    container.appendChild(button);
                    clearInterval(waitForBar);
                    log('Button added');
                }
            }, 100);
        });
}

async function reFetch(url, retries) {
    return fetch(url, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('spotify_fs_token')}`,
        },
    }).then(async (res) => {
        if (res.ok) return res;
        if (retries > 0) {
            if (res.status === 401) {
                const newToken = await getToken();
                localStorage.setItem('spotify_fs_token', newToken);
            }
            return reFetch(url, retries - 1);
        }
        throw new Error(res.status === 401 ? 'Could not authenticate' : 'Error getting response');
    });
}

async function getCurrentSongInfo() {
    if (!localStorage.getItem('spotify_fs_token')) {
        localStorage.setItem('spotify_fs_token', await getToken());
    }

    const infoElement = document.querySelector('a[data-testid="context-link"]');
    const ID = infoElement.href.split('track%3A')[1];

    const songInfo = await reFetch(`https://api.spotify.com/v1/tracks/${ID}`, 1)
        .then((res) => {
            return res.json();
        })
        .catch((err) => {
            log(err.message);
        });

    if (songInfo === undefined) return null;
    return {
        artists: songInfo.artists.map((artist) => artist.name),
        cover: songInfo.album.images[0].url,
        name: songInfo.name,
    };
}

async function getToken() {
    log('Requesting token');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${client_id}:${client_secret}`),
        },
        body: params.toString(),
    }).then((res) => res.json());

    return res.access_token;
}

function toggleFullscreen() {
    fullscreen = !fullscreen;
    showFullscreen(fullscreen);
}

// document.querySelector('a[data-testid="context-link"]')
async function showFullscreen(show) {
    const info = await getCurrentSongInfo();
    console.log(info);
    const overlay = document.querySelector('.fs-overlay-container');

    if (show) {
        log('Showing fullscreen');
        overlay.style.top = '0px';
    } else {
        log('Hiding fullscreen');
        overlay.style.top = window.innerHeight + 'px';
    }
}

function log(val) {
    console.log(`[Spotify FS]: ${val}`);
}
