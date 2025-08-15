# Use nginx to serve static files
FROM nginx:alpine

# Copy the web application files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY favicon.ico /usr/share/nginx/html/
COPY og.png /usr/share/nginx/html/

# Copy custom nginx configuration if needed
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
