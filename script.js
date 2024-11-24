class NewsStream {
    constructor() {
        this.container = document.querySelector('.news-container');
        this.queue = [];
        this.isAnimating = false;
        this.displayDuration = 5000; // How long each item stays visible
        this.sharedLinks = new Map(); // Track shared link counts
        this.topSharedContainer = document.querySelector('.shared-links');
        
        this.marqueeTrack = document.querySelector('.marquee-track');
        this.marqueeItems = [];
        this.marqueeSpeed = 1; // pixels per frame
        this.maxMarqueeItems = 20; // Maximum number of items to keep in marquee
        
        this.startTime = new Date();
        this.timeIndicator = document.querySelector('.time-indicator');
        this.timeIndicator.innerHTML = '(gathering first stories... please wait)<span class="loading-spinner"></span>';
        
        this.initWebSocket();
        this.processQueue();
        
        // Update top shared links every minute
        setInterval(() => this.updateTopSharedLinks(), 60000);
        
        this.marqueeRows = 1;
        this.expandButton = document.querySelector('.expand-marquee');
        this.resetButton = document.querySelector('.reset-marquee');
        this.expandButton.addEventListener('click', () => this.expandMarquee());
        this.resetButton.addEventListener('click', () => this.resetMarquee());
        this.marqueeContainer = document.querySelector('.marquee-container');
        
        // Initialize animation for the first track
        const firstTrack = this.marqueeTrack;
        firstTrack.dataset.row = 0;
        this.initializeTrackAnimation(firstTrack, 0);
    }

    initWebSocket() {
        const connectWebSocket = () => {
            const url = "wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post";
            const ws = new WebSocket(url);

            ws.onmessage = (event) => {
                const json = JSON.parse(event.data);
                const record = json.commit?.record;
                
                if (record && record.embed?.$type === "app.bsky.embed.external") {
                    const external = record.embed.external;
                    const thumbLink = external.thumb?.ref?.$link;
                    
                    const content = {
                        title: external.title || 'No Title',
                        url: external.uri || '#',
                        description: external.description || '',
                        timestamp: new Date(),
                        thumb: thumbLink ? this.getThumbUrl(thumbLink, json.did) : null
                    };
                    
                    // Add to marquee if there's a thumbnail
                    if (content.thumb) {
                        // Find the track with the least items
                        const tracks = Array.from(this.marqueeContainer.querySelectorAll('.marquee-track'));
                        const targetTrack = tracks.reduce((prev, current) => 
                            prev.children.length <= current.children.length ? prev : current
                        );
                        
                        if (targetTrack && targetTrack.children.length < this.maxMarqueeItems) {
                            const marqueeItem = this.createMarqueeItem(content, targetTrack.dataset.row);
                            targetTrack.appendChild(marqueeItem);
                        }
                    }
                    
                    // Track shared links with unique users
                    if (content.url !== '#') {
                        if (!this.sharedLinks.has(content.url)) {
                            this.sharedLinks.set(content.url, {
                                title: content.title,
                                description: content.description,
                                thumbLink: thumbLink,
                                did: json.did,
                                count: 1,
                                firstSeen: content.timestamp,
                                uniqueUsers: new Set([json.did]) // Track unique users
                            });
                        } else {
                            const data = this.sharedLinks.get(content.url);
                            // Only increment count if this user hasn't shared before
                            if (!data.uniqueUsers.has(json.did)) {
                                data.count++;
                                data.uniqueUsers.add(json.did);
                                this.sharedLinks.set(content.url, data);
                            }
                        }
                        this.updateTopSharedLinks();
                    }
                    
                    this.queue.push(content);
                }
            };

            ws.onopen = () => console.log("Connected to Bluesky WebSocket");
            ws.onerror = (error) => console.error("WebSocket error:", error);
            
            ws.onclose = () => {
                console.log("WebSocket connection closed, attempting to reconnect...");
                // Wait 5 seconds before attempting to reconnect
                setTimeout(connectWebSocket, 5000);
            };
        };

        connectWebSocket();
    }

    createNewsItem(content) {
        const item = document.createElement('a');
        item.className = 'news-item';
        item.href = content.url;
        item.target = '_blank';
        
        const time = document.createElement('div');
        time.className = 'news-time';
        time.textContent = content.timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const headline = document.createElement('div');
        headline.className = 'news-headline';
        // Truncate title if it's too long
        const maxLength = window.innerWidth <= 480 ? 60 : 100;
        headline.textContent = content.title.length > maxLength ? 
            content.title.substring(0, maxLength) + '...' : 
            content.title;
        
        const source = document.createElement('div');
        source.className = 'news-source';
        source.textContent = new URL(content.url).hostname;
        
        item.appendChild(time);
        item.appendChild(headline);
        item.appendChild(source);
        
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

    // Add this method to track the current top links
    getTopLinks() {
        return [...this.sharedLinks.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([url, data]) => ({
                url,
                title: data.title,
                description: data.description,
                thumb: data.thumbLink ? this.getThumbUrl(data.thumbLink, data.did) : null,
                count: data.count,
                hostname: new URL(url).hostname
            }));
    }

    // Modified updateTopSharedLinks method
    updateTopSharedLinks() {
        const newTopLinks = this.getTopLinks();
        
        // Check if the current top links are different from the last update
        const hasChanged = !this.lastTopLinks || JSON.stringify(newTopLinks) !== JSON.stringify(this.lastTopLinks);
        
        if (hasChanged) {
            // Create a map of existing elements by URL for reuse
            const existingElements = new Map();
            Array.from(this.topSharedContainer.children).forEach(element => {
                const url = element.getAttribute('data-url');
                if (url) existingElements.set(url, element);
            });
            
            // Clear the container
            this.topSharedContainer.innerHTML = '';
            
            newTopLinks.forEach(({url, title, description, thumb, count, hostname}) => {
                let linkElement;
                
                // Reuse existing element if available
                if (existingElements.has(url)) {
                    linkElement = existingElements.get(url);
                    // Update only the dynamic content (count)
                    const statsElement = linkElement.querySelector('.shared-link-stats');
                    if (statsElement) {
                        statsElement.textContent = `Shared ${count} time${count !== 1 ? 's' : ''} • ${hostname}`;
                    }
                } else {
                    // Create new element if it doesn't exist
                    linkElement = document.createElement('a');
                    linkElement.className = 'shared-link';
                    linkElement.href = url;
                    linkElement.target = '_blank';
                    linkElement.setAttribute('data-url', url);
                    
                    // Create the HTML structure
                    const thumbHtml = thumb ? `
                        <div class="shared-link-thumb${!thumb ? ' no-image' : ''}">
                            <img src="${thumb}" alt="" loading="lazy">
                        </div>
                    ` : `
                        <div class="shared-link-thumb no-image"></div>
                    `;
                    
                    linkElement.innerHTML = `
                        ${thumbHtml}
                        <div class="shared-link-content">
                            <div class="shared-link-title">${title}</div>
                            ${description ? `<div class="shared-link-description">${description}</div>` : ''}
                            <div class="shared-link-stats">
                                Shared ${count} time${count !== 1 ? 's' : ''} • 
                                ${hostname}
                            </div>
                        </div>
                    `;
                    
                    // Add image load handler
                    if (thumb) {
                        const img = linkElement.querySelector('img');
                        img.addEventListener('load', () => {
                            img.classList.add('loaded');
                        });
                        img.addEventListener('error', () => {
                            img.parentElement.classList.add('no-image');
                            img.remove();
                        });
                    }
                }
                
                this.topSharedContainer.appendChild(linkElement);
            });
            
            this.lastTopLinks = newTopLinks;
        }
    }

    // Add this helper method to generate thumbnail URLs
    getThumbUrl(thumbLink, did) {
        if (!thumbLink || !did) return null;
        return `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${thumbLink}@jpeg`;
    }

    createMarqueeItem(content, rowIndex) {
        const item = document.createElement('a');
        item.className = 'marquee-item';
        item.href = content.url;
        item.target = '_blank';
        item.dataset.row = rowIndex;
        
        const thumb = document.createElement('div');
        thumb.className = 'marquee-thumb loading';
        
        const img = document.createElement('img');
        img.src = content.thumb;
        img.alt = content.title;
        img.addEventListener('load', () => {
            img.classList.add('loaded');
            thumb.classList.remove('loading');
        });
        img.addEventListener('error', () => {
            thumb.classList.add('loading');
            img.remove();
        });
        
        const title = document.createElement('div');
        title.className = 'marquee-title';
        title.textContent = content.title;
        
        thumb.appendChild(img);
        item.appendChild(thumb);
        item.appendChild(title);
        
        return item;
    }

    initializeTrackAnimation(track, rowIndex) {
        let position = 0;
        const trackHeight = window.innerWidth <= 768 ? 140 : 180;
        const verticalOffset = trackHeight * rowIndex;
        
        const animate = () => {
            position -= this.marqueeSpeed;
            
            // Reset position when first item goes completely off-screen
            if (track.children.length > 0) {
                const firstItem = track.children[0];
                if (-position > firstItem.offsetWidth + 20) { // 20 is the gap
                    position += firstItem.offsetWidth + 20;
                    track.removeChild(firstItem);
                }
            }
            
            // Combine horizontal movement with vertical position
            track.style.transform = `translate(${position}px, ${verticalOffset}px)`;
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    expandMarquee() {
        this.marqueeRows++;
        const baseHeight = window.innerWidth <= 768 ? 140 : 180;
        const newHeight = baseHeight * this.marqueeRows;
        this.marqueeContainer.style.setProperty('--marquee-height', `${newHeight}px`);
        
        // Create a new marquee track for the new row
        const newTrack = document.createElement('div');
        newTrack.className = 'marquee-track';
        newTrack.dataset.row = this.marqueeRows - 1;
        
        this.marqueeContainer.appendChild(newTrack);
        
        // Update buttons
        this.expandButton.textContent = `Add News Row (${this.marqueeRows} rows)`;
        this.resetButton.style.display = 'block'; // Show reset button after first expansion
        
        // Initialize animation for the new track
        this.initializeTrackAnimation(newTrack, this.marqueeRows - 1);
        
        // Update marquee speed
        this.updateMarqueeSpeed();
    }

    resetMarquee() {
        // Remove all tracks except the first one
        const tracks = Array.from(this.marqueeContainer.querySelectorAll('.marquee-track'));
        tracks.slice(1).forEach(track => track.remove());
        
        // Reset height
        const baseHeight = window.innerWidth <= 768 ? 140 : 180;
        this.marqueeContainer.style.setProperty('--marquee-height', `${baseHeight}px`);
        
        // Reset row count
        this.marqueeRows = 1;
        
        // Update buttons
        this.expandButton.textContent = 'Show More News';
        this.resetButton.style.display = 'none';
        
        // Reset marquee speed
        this.updateMarqueeSpeed();
    }

    updateTimeIndicator() {
        const minutesSinceStart = Math.floor((new Date() - this.startTime) / 60000);
        let timeText;
        
        if (minutesSinceStart < 1) {
            timeText = '(gathering first stories... please wait)<span class="loading-spinner"></span>';
        } else {
            // Remove spinner when switching to time display
            timeText = `(last ${minutesSinceStart} minute${minutesSinceStart > 1 ? 's' : ''})`;
        }
        
        if (this.timeIndicator) {
            this.timeIndicator.innerHTML = timeText;
        }
    }

    updateMarqueeSpeed() {
        // Slower speed on mobile, adjusted for number of rows
        const baseSpeed = window.innerWidth <= 768 ? 0.5 : 1;
        this.marqueeSpeed = baseSpeed / Math.sqrt(this.marqueeRows); // Gradually slow down as rows increase
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new NewsStream();
});