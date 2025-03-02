from flask import Flask, render_template, request, redirect, url_for, session, flash
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import logging
from random import shuffle, choice
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Flask app configuration
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(12))

# Spotify API configuration
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI', 'http://localhost:5000/callback')

# Constants
REQUEST_LIMIT = 100
TRACK_RANGES = {
    'tracks1': (999, 2000, 2),
    'tracks2': (1999, 3000, 2),
    'tracks3': (399, 900, 1)
}

# Name generation data
ADJECTIVES = [
    "Different", "Important", "Popular", "Creative", "Unique", "Mysterious", "Energetic",
    "Peaceful", "Vibrant", "Magical", "Wild", "Gentle", "Bold", "Cosmic", "Dreamy"
]

ANIMAL_NAMES = [
    "Wolf", "Eagle", "Dolphin", "Tiger", "Owl", "Fox", "Bear", "Lion", "Hawk",
    "Panther", "Dragon", "Phoenix", "Raven", "Leopard", "Falcon"
]

def get_spotify():
    """Create or get Spotify client."""
    auth_manager = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope="user-library-read playlist-modify-public",
        cache_path=".cache"
    )
    return spotipy.Spotify(auth_manager=auth_manager)

def get_user_playlists(username):
    """Get public playlists for a given username."""
    try:
        sp = get_spotify()
        playlists = sp.user_playlists(username)
        return [{'id': pl['id'], 'name': pl['name'], 'tracks': pl['tracks']['total']} 
                for pl in playlists['items']]
    except Exception as e:
        logger.error(f"Error fetching playlists for {username}: {e}")
        return None

def process_playlist(playlist_id):
    """Process a playlist and create new derivative playlists."""
    try:
        sp = get_spotify()
        tracks = []
        
        # Get playlist tracks
        results = sp.playlist_items(playlist_id)
        tracks.extend(results['items'])
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])
        
        # Shuffle tracks
        shuffle(tracks)
        shuffle(tracks)
        
        # Process into separate lists
        track_lists = {}
        for list_name, (start, end, step) in TRACK_RANGES.items():
            track_subset = tracks[start:end:step]
            track_lists[list_name] = [val['track']['id'] for val in track_subset if val['track'] and val['track']['id']]
        
        # Create new playlists
        created_playlists = []
        for list_name, track_list in track_lists.items():
            if track_list:
                nomen = f"{choice(ADJECTIVES)} {choice(ANIMAL_NAMES)}"
                playlist = sp.user_playlist_create(
                    sp.me()['id'],
                    nomen,
                    public=True,
                    description=f'Generated from playlist {playlist_id}'
                )
                
                # Add tracks in batches
                for i in range(0, len(track_list), 100):
                    batch = track_list[i:i+100]
                    if batch:
                        sp.playlist_add_items(playlist['id'], batch)
                
                created_playlists.append({
                    'name': nomen,
                    'id': playlist['id'],
                    'url': f"https://open.spotify.com/playlist/{playlist['id']}"
                })
        
        return created_playlists
    except Exception as e:
        logger.error(f"Error processing playlist {playlist_id}: {e}")
        return None

@app.route('/')
def index():
    """Home page."""
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    """Search for a user's playlists."""
    username = request.form.get('username')
    if not username:
        flash('Please enter a username', 'error')
        return redirect(url_for('index'))
    
    playlists = get_user_playlists(username)
    if playlists is None:
        flash('Error fetching playlists. Please check the username and try again.', 'error')
        return redirect(url_for('index'))
    
    return render_template('playlists.html', username=username, playlists=playlists)

@app.route('/process/<playlist_id>')
def process(playlist_id):
    """Process a selected playlist."""
    created_playlists = process_playlist(playlist_id)
    if created_playlists is None:
        flash('Error processing playlist. Please try again.', 'error')
        return redirect(url_for('index'))
    
    return render_template('results.html', playlists=created_playlists)

@app.route('/callback')
def callback():
    """Handle Spotify OAuth callback."""
    return redirect(url_for('index'))

if __name__ == '__main__':
    # Development settings
    app.run(debug=True, port=5000) 