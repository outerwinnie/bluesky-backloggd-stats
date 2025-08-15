# Backloggd Reviews on Bluesky

A real-time web application that tracks Backloggd game reviews shared on Bluesky, showing the most reviewed games and latest review activity.

## Features

- Real-time WebSocket connection to Bluesky
- Filters for Backloggd review URLs only
- Shows most reviewed games (aggregated by game name)
- Scrolling marquee of recent reviews with thumbnails
- Responsive design for mobile and desktop

## Docker Deployment

### Quick Start

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Access the application:**
Open http://localhost:8080 in your browser

### Manual Docker Commands

1. **Build the image:**
```bash
docker build -t backloggd-reviews .
```

2. **Run the container:**
```bash
docker run -d -p 8080:80 --name backloggd-reviews-app backloggd-reviews
```

### Custom Port

To run on a different port (e.g., 3000):
```bash
docker run -d -p 3000:80 --name backloggd-reviews-app backloggd-reviews
```

### Stop the Application

```bash
# Using docker-compose
docker-compose down

# Using docker directly
docker stop backloggd-reviews-app
docker rm backloggd-reviews-app
```

## Development

For local development, simply open `index.html` in a web browser. The application connects directly to Bluesky's WebSocket API.

## How It Works

1. Connects to Bluesky's real-time firehose
2. Filters posts containing Backloggd review URLs (`backloggd.com/u/*/review/*`)
3. Extracts game names from review titles
4. Aggregates reviews by game and unique users
5. Displays top games and recent activity
