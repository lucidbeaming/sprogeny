import spotipy
from spotipy.oauth2 import SpotifyOAuth
from random import shuffle, choice
import logging
import os
from typing import List
from dotenv import load_dotenv
import sqlite3
import argparse

# Add before accessing environment variables
load_dotenv()

db_connection = sqlite3.connect("duplicate_tracks.db")
db_cursor = db_connection.cursor()
db_cursor.execute("CREATE TABLE IF NOT EXISTS used_ids(id)")
db_cursor.execute("SELECT * FROM used_ids")
used_ids = db_cursor.fetchall()
# Extract IDs from tuples to create a flat list
used_ids = [id_tuple[0] for id_tuple in used_ids]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI')
# Spotify API Authentication
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET,
    redirect_uri=SPOTIFY_REDIRECT_URI,
    scope="user-library-read playlist-modify-public playlist-modify-private"
))

REQUEST_LIMIT = 100
PLAYLIST_LENGTH = 200
PLAYLIST_ID_ARRAY = ["2iy3nUibZu1C6SvlMKEPJv", "28pi8Ls7Suydu2Cmu3YVW7", "13xKy2z1TZRkW3OPOtWdvq", "0auF3aEpOVlDsCyTge7dsk"]
PLAYLIST_LABELS = {
    "aax": 0,
    "ranger": 1,
    "classical": 2,
    "nostalgia": 3
}
# Lists for storing track data
tracks = []
track_lists = {
    'tracks1': [],
    'tracks2': [],
    'tracks3': []
}

def verify_spotify_auth():
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

def get_playlist_tracks(playlist_id, fields=None, limit=REQUEST_LIMIT, offset=0, market=None, additional_types=('track', 'episode')):
    try:
        return sp.playlist_items(playlist_id, fields, limit, offset, market, additional_types)
    except Exception as e:
        logger.error(f"Error fetching playlist tracks: {e}")
        return None

def fetch_and_shuffle_tracks(playlist_ids=None, weights=None):
    if playlist_ids is None:
        playlist_ids = PLAYLIST_ID_ARRAY
        weights = [1.0] * len(PLAYLIST_ID_ARRAY)  # Default equal weights
    
    # Validate weights
    if weights is None:
        weights = [1.0] * len(playlist_ids)
    elif len(weights) != len(playlist_ids):
        logger.error("Number of weights must match number of playlist IDs")
        return False
    
    # Normalize weights to sum to 1
    total_weight = sum(weights)
    weights = [w/total_weight for w in weights]
    
    # Clear tracks list before populating
    tracks.clear()
    all_playlist_tracks = {}  # Store tracks from each playlist separately
    
    # First, fetch all tracks from each playlist
    for idx, playlist_id in enumerate(playlist_ids):
        try:
            playlist_tracks = []
            # Get total number of tracks
            playlist_info = get_playlist_tracks(playlist_id)
            if not playlist_info:
                return False
            
            total_tracks = playlist_info["total"]
            logger.info(f"Total tracks to process for playlist {playlist_id}: {total_tracks}")
            
            # Fetch all tracks in batches
            for i in range(0, total_tracks, REQUEST_LIMIT):
                request_buffer = get_playlist_tracks(
                    playlist_id,
                    "items(track(name,id))",
                    REQUEST_LIMIT,
                    i
                )
                if request_buffer:
                    playlist_tracks.extend(request_buffer["items"])
                    logger.info(f"Fetched tracks {i} to {min(i + REQUEST_LIMIT, total_tracks)}")
            
            if not playlist_tracks:
                logger.error(f"No tracks were fetched from playlist {playlist_id}")
                return False
                
            all_playlist_tracks[playlist_id] = playlist_tracks
            
        except Exception as e:
            logger.error(f"Error in fetch_and_shuffle_tracks for playlist {playlist_id}: {e}")
            return False
    
    # Now combine tracks based on weights
    for idx, playlist_id in enumerate(playlist_ids):
        playlist_tracks = all_playlist_tracks[playlist_id]
        # Calculate number of tracks to take from this playlist
        num_tracks = int(len(playlist_tracks) * weights[idx])
        # Shuffle the playlist's tracks
        shuffle(playlist_tracks)
        # Take the calculated number of tracks
        tracks.extend(playlist_tracks[:num_tracks])
    
    # Final shuffle of all combined tracks
    shuffle(tracks)
    shuffle(tracks)
    shuffle(tracks)
    
    if not tracks:
        logger.error("No tracks were fetched after combining playlists")
        return False
        
    logger.info(f"Combined {len(tracks)} tracks from {len(playlist_ids)} playlists")
    return True

def process_track_lists():
    track_ids = [val['track']['id'] for val in tracks[0:len(tracks)] if val['track']['id'] is not None]
    # Create a new list with only the tracks that aren't in used_ids
    filtered_track_ids = [track_id for track_id in track_ids if track_id not in used_ids]
    # Log how many tracks were filtered out
    removed_count = len(track_ids) - len(filtered_track_ids)
    if removed_count > 0:
        logger.info(f"Removed {removed_count} tracks that were already used")
    # Replace the original list with the filtered one
    track_ids = filtered_track_ids

    try:
        track_index = 0
        for list_name in track_lists:
            end_index = min(track_index + PLAYLIST_LENGTH, len(track_ids))
            track_subset = track_ids[track_index:end_index]
            track_lists[list_name] = track_subset
            logger.info(f"Processed {len(track_lists[list_name])} tracks for {list_name}")
            track_index += PLAYLIST_LENGTH
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

def create_and_populate_playlist(track_list: List[str], source_label: str = "") -> str:
    try:
        # Generate playlist name using adjective-animal style, prefixed by source label
        prefix = f"{source_label} - " if source_label else ""
        nomen = f"{prefix}{choice(ADJECTIVES)} {choice(ANIMAL_NAMES)}"
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
        for i in range(0, len(track_list), 100):
            batch = track_list[i:i+100]
            if batch:
                sp.playlist_add_items(playlist['id'], batch)
                try:
                    for item in batch:
                        db_cursor.execute("INSERT INTO used_ids(id) VALUES (?)", (item,))
                        logger.info(f"inserting into used_ids: {item}")
                        db_connection.commit()
                except Exception as e:
                    logger.error(f"Error inserting into used_ids: {e}")
                logger.info(f"Added {len(batch)} tracks to {nomen}")
        return playlist['id']
    except Exception as e:
        logger.error(f"Error in create_and_populate_playlist: {e}")
        return None

def display_playlist_contents(playlist_id: str) -> None:
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
    parser = argparse.ArgumentParser(description="Spotify Playlist Generator")
    parser.add_argument(
        '--source',
        type=str,
        default='combined',
        help=f"Playlist source label: one of {list(PLAYLIST_LABELS.keys())} or 'combined' for all"
    )
    parser.add_argument(
        '--weights',
        type=str,
        help="Comma-separated list of weights for each playlist (only used with --source combined). Example: '0.4,0.3,0.2,0.1'"
    )
    args = parser.parse_args()
    logger.info(f"Starting Spotify playlist processing with source: {args.source}")
    
    # Verify authentication before proceeding
    logger.info("Verifying Spotify authentication...")
    if not verify_spotify_auth():
        logger.error("Authentication verification failed. Exiting...")
        return

    # Determine playlist IDs to use
    if args.source == 'combined':
        playlist_ids = PLAYLIST_ID_ARRAY
        source_label = 'combined'
        
        # Parse weights if provided
        weights = None
        if args.weights:
            try:
                weights = [float(w.strip()) for w in args.weights.split(',')]
                if len(weights) != len(playlist_ids):
                    logger.error(f"Number of weights ({len(weights)}) must match number of playlists ({len(playlist_ids)})")
                    return
                logger.info(f"Using weights: {weights}")
            except ValueError:
                logger.error("Weights must be comma-separated numbers")
                return
    elif args.source in PLAYLIST_LABELS:
        playlist_ids = [PLAYLIST_ID_ARRAY[PLAYLIST_LABELS[args.source]]]
        source_label = args.source
        weights = None
    else:
        logger.error(f"Invalid source label: {args.source}. Must be one of {list(PLAYLIST_LABELS.keys())} or 'combined'.")
        return

    # Part 1: Fetch and process tracks
    logger.info("1. Fetching and shuffling tracks...")
    if not fetch_and_shuffle_tracks(playlist_ids, weights):
        return
    logger.info("2. Processing track lists...")
    if not process_track_lists():
        return
    logger.info("3. Creating and populating playlists...")
    # Create three playlists and store their IDs
    playlist_ids_dict = {}
    for list_name in track_lists:
        playlist_id = create_and_populate_playlist(track_lists[list_name], source_label)
        if playlist_id:
            playlist_ids_dict[list_name] = playlist_id
    logger.info("\nDisplaying contents of created playlists:")
    for list_name, playlist_id in playlist_ids_dict.items():
        logger.info(f"\nContents of {list_name}:")
        display_playlist_contents(playlist_id)
    logger.info("\nProcess completed successfully!")
    db_connection.close()

if __name__ == "__main__":
    main() 