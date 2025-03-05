# Sprogeny

A Flask web application that generates new Spotify playlists from existing ones using a unique algorithm.

## Features

- Search for Spotify users and view their public playlists
- Select a playlist to generate new derivative playlists
- Automatic playlist generation with creative naming
- Direct links to open generated playlists in Spotify
- Modern and responsive web interface

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sprogeny.git
cd sprogeny
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```
Edit `.env` with your Spotify API credentials and other configuration.

## Development

To run the development server:

```bash
flask run
```

The application will be available at `http://localhost:5000`.

## Production Deployment

For production deployment using Gunicorn:

```bash
gunicorn wsgi:app
```

## Configuration

The following environment variables can be configured in `.env`:

- `FLASK_APP`: The Flask application entry point
- `FLASK_ENV`: The environment (development/production)
- `FLASK_DEBUG`: Enable/disable debug mode
- `FLASK_SECRET_KEY`: Secret key for session management
- `SPOTIFY_CLIENT_ID`: Your Spotify API client ID
- `SPOTIFY_CLIENT_SECRET`: Your Spotify API client secret
- `SPOTIFY_REDIRECT_URI`: OAuth redirect URI

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
