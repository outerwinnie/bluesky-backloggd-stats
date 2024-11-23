class NewsStream {
    constructor() {
        this.container = document.querySelector('.news-container');
        this.queue = [];
        this.isAnimating = false;
        this.displayDuration = 5000; // How long each item stays visible
        
        this.initWebSocket();
        this.processQueue();
    }

    initWebSocket() {
        const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";
        const ws = new WebSocket(url);

        ws.onmessage = (event) => {
            const json = JSON.parse(event.data);
            const record = json.commit?.record;
            
            if (record && record.embed?.$type === "app.bsky.embed.external") {
                const content = {
                    title: record.embed.external.title || 'No Title',
                    url: record.embed.external.uri || '#',
                    timestamp: new Date()
                };
                this.queue.push(content);
            }
        };

        ws.onopen = () => console.log("Connected to Bluesky WebSocket");
        ws.onerror = (error) => console.error("WebSocket error:", error);
        ws.onclose = () => console.log("WebSocket connection closed");
    }

    createNewsItem(content) {
        const item = document.createElement('div');
        item.className = 'news-item';
        
        const time = document.createElement('div');
        time.className = 'news-time';
        time.textContent = content.timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const headline = document.createElement('div');
        headline.className = 'news-headline';
        headline.textContent = content.title;
        
        const source = document.createElement('div');
        source.className = 'news-source';
        source.textContent = new URL(content.url).hostname;
        
        item.appendChild(time);
        item.appendChild(headline);
        item.appendChild(source);
        
        item.addEventListener('click', () => window.open(content.url, '_blank'));
        
        return item;
    }

    async showNewsItem(content) {
        const item = this.createNewsItem(content);
        this.container.innerHTML = ''; // Clear previous item
        this.container.appendChild(item);
        
        // Slide in from right
        item.style.transform = 'translateX(100%)';
        await new Promise(r => setTimeout(r, 50)); // Small delay for animation
        item.style.transform = 'translateX(0)';

        // Get the progress bar element
        const progressBar = this.container.querySelector('::after');
        
        // Animate the progress bar
        const startTime = performance.now();
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / this.displayDuration, 1);
            this.container.style.setProperty('--progress', progress);
        };

        // Start progress bar animation
        this.container.style.setProperty('--progress', '0');
        const animation = this.container.animate(
            [
                { transform: 'scaleX(0)' },
                { transform: 'scaleX(1)' }
            ],
            {
                duration: this.displayDuration,
                easing: 'linear',
                pseudoElement: '::after'
            }
        );
        
        // Wait for display duration
        await new Promise(r => setTimeout(r, this.displayDuration));
        
        // Slide out to left
        item.style.transform = 'translateX(-100%)';
        await new Promise(r => setTimeout(r, 1000)); // Wait for slide out animation
    }

    async processQueue() {
        while (true) {
            if (this.queue.length > 0 && !this.isAnimating) {
                this.isAnimating = true;
                const content = this.queue.shift();
                await this.showNewsItem(content);
                this.isAnimating = false;
            }
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new NewsStream();
});