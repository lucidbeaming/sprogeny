import spotipy
from spotipy.oauth2 import SpotifyOAuth
from random import shuffle, choice
import logging
import os
from typing import Dict, List

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')

# Spotify API Authentication
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri="https://lucidbeaming.com",
    scope="user-library-read playlist-modify-public"
))

def verify_spotify_auth():
    """
    Verify Spotify authentication and required permissions.
    Returns True if all checks pass, False otherwise.
    """
    try:
        # Test basic authentication by getting current user
        user = sp.current_user()
        if not user:
            logger.error("Could not retrieve user information. Authentication failed.")
            return False
        logger.info(f"Successfully authenticated as user: {user['display_name']} (ID: {user['id']})")

        # Test playlist reading permissions
        try:
            sp.current_user_playlists(limit=1)
            logger.info("✓ Playlist reading permission verified")
        except Exception as e:
            logger.error(f"Playlist reading permission test failed: {str(e)}")
            logger.error("Make sure 'playlist-read-private' scope is properly authorized")
            return False

        # Test playlist creation permissions
        try:
            test_playlist = sp.user_playlist_create(
                user['id'],
                "Test Playlist (Will be Deleted)",
                public=False,
                description="Testing playlist creation permissions"
            )
            logger.info("✓ Playlist creation permission verified")
            
            # Clean up test playlist
            sp.current_user_unfollow_playlist(test_playlist['id'])
            logger.info("✓ Test playlist cleaned up")
        except Exception as e:
            logger.error(f"Playlist creation permission test failed: {str(e)}")
            logger.error("Make sure 'playlist-modify-public' and 'playlist-modify-private' scopes are properly authorized")
            return False

        # Test library access permissions
        try:
            sp.current_user_saved_tracks(limit=1)
            logger.info("✓ Library access permission verified")
        except Exception as e:
            logger.error(f"Library access permission test failed: {str(e)}")
            logger.error("Make sure 'user-library-read' scope is properly authorized")
            return False

        logger.info("All authentication checks passed successfully!")
        return True

    except Exception as e:
        logger.error(f"Critical authentication error: {str(e)}")
        logger.error("\nPossible issues:")
        logger.error("1. Invalid client_id or client_secret")
        logger.error("2. Invalid redirect URI")
        logger.error("3. Network connectivity problems")
        logger.error("4. Spotify API service issues")
        logger.error("Please verify your credentials and try again.")
        return False

# Constants
REQUEST_LIMIT = 100
SOURCE_PLAYLIST_ID = "2iy3nUibZu1C6SvlMKEPJv"
TRACK_RANGES = {
    'tracks1': (999, 2000, 2),    # start, end, step
    'tracks2': (1999, 3000, 2),
    'tracks3': (399, 900, 1)
}

# Lists for storing track data
tracks = []
track_lists = {
    'tracks1': [],
    'tracks2': [],
    'tracks3': []
}

def get_playlist_tracks(playlist_id, fields=None, limit=REQUEST_LIMIT, offset=0, market=None, additional_types=('track', 'episode')):
    """Fetch tracks from a playlist with error handling."""
    try:
        return sp.playlist_items(playlist_id, fields, limit, offset, market, additional_types)
    except Exception as e:
        logger.error(f"Error fetching playlist tracks: {e}")
        return None

def fetch_and_shuffle_tracks():
    """Fetch all tracks from source playlist and shuffle them."""
    try:
        # Get total number of tracks
        playlist_info = get_playlist_tracks(SOURCE_PLAYLIST_ID)
        if not playlist_info:
            return False
        
        total_tracks = playlist_info["total"]
        logger.info(f"Total tracks to process: {total_tracks}")

        # Fetch all tracks in batches
        for i in range(0, total_tracks, REQUEST_LIMIT):
            request_buffer = get_playlist_tracks(
                SOURCE_PLAYLIST_ID,
                "items(track(name,id))",
                REQUEST_LIMIT,
                i
            )
            if request_buffer:
                tracks.extend(request_buffer["items"])
                logger.info(f"Fetched tracks {i} to {min(i + REQUEST_LIMIT, total_tracks)}")

        # Double shuffle for better randomization
        shuffle(tracks)
        shuffle(tracks)
        return True
    except Exception as e:
        logger.error(f"Error in fetch_and_shuffle_tracks: {e}")
        return False

def process_track_lists():
    """Process tracks into separate lists based on defined ranges."""
    try:
        for list_name, (start, end, step) in TRACK_RANGES.items():
            track_subset = tracks[start:end:step]
            track_lists[list_name] = [val['track']['id'] for val in track_subset if val['track']['id'] is not None]
            logger.info(f"Processed {len(track_lists[list_name])} tracks for {list_name}")
        return True
    except Exception as e:
        logger.error(f"Error processing track lists: {e}")
        return False

# Name generation data
ADJECTIVES = [
    "Different", "Important", "Popular", "Creative", "Unique", "Mysterious", "Energetic",
    "Peaceful", "Vibrant", "Magical", "Wild", "Gentle", "Bold", "Cosmic", "Dreamy"
]

ANIMAL_NAMES = [
    "Wolf", "Eagle", "Dolphin", "Tiger", "Owl", "Fox", "Bear", "Lion", "Hawk",
    "Panther", "Dragon", "Phoenix", "Raven", "Leopard", "Falcon"
]

def create_and_populate_playlist(track_list: List[str]) -> str:
    """Create a new playlist and populate it with tracks. Returns playlist ID if successful."""
    try:
        # Generate playlist name using adjective-animal style
        nomen = f"{choice(ADJECTIVES)} {choice(ANIMAL_NAMES)}"

        # Create playlist
        playlist = sp.user_playlist_create(
            sp.me()['id'],
            nomen,
            public=True,
            collaborative=False,
            description='Automatically generated playlist'
        )
        logger.info(f"Created playlist: {nomen} ({playlist['id']})")

        # Add tracks in batches
        for i in range(100, 300, 100):
            batch = track_list[i:i+100]
            if batch:
                sp.playlist_add_items(playlist['id'], batch)
                logger.info(f"Added {len(batch)} tracks to {nomen}")

        return playlist['id']
    except Exception as e:
        logger.error(f"Error in create_and_populate_playlist: {e}")
        return None

def display_playlist_contents(playlist_id: str) -> None:
    """Display the contents of a playlist."""
    try:
        playlist = sp.playlist(playlist_id)
        logger.info(f"\nPlaylist: {playlist['name']}")
        logger.info("-" * 50)
        
        tracks = sp.playlist_tracks(playlist_id)
        for i, item in enumerate(tracks['items'], 1):
            track = item['track']
            artists = ", ".join([artist['name'] for artist in track['artists']])
            logger.info(f"{i}. {track['name']} - {artists}")
        
        logger.info("-" * 50)
    except Exception as e:
        logger.error(f"Error displaying playlist contents: {e}")

def main():
    """Main execution function."""
    logger.info("Starting Spotify playlist processing...")

    # Verify authentication before proceeding
    logger.info("Verifying Spotify authentication...")
    if not verify_spotify_auth():
        logger.error("Authentication verification failed. Exiting...")
        return

    # Part 1: Fetch and process tracks
    logger.info("1. Fetching and shuffling tracks...")
    if not fetch_and_shuffle_tracks():
        return
    
    logger.info("2. Processing track lists...")
    if not process_track_lists():
        return

    logger.info("3. Creating and populating playlists...")
    # Create three playlists and store their IDs
    playlist_ids = {}
    for list_name in track_lists:
        playlist_id = create_and_populate_playlist(track_lists[list_name])
        if playlist_id:
            playlist_ids[list_name] = playlist_id

    logger.info("\nDisplaying contents of created playlists:")
    for list_name, playlist_id in playlist_ids.items():
        logger.info(f"\nContents of {list_name}:")
        display_playlist_contents(playlist_id)

    logger.info("\nProcess completed successfully!")

if __name__ == "__main__":
    main() 