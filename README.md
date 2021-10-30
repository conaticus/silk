# Silk

A configuration-based web server software for quick and easy deployment.

# Configurations

To configure silk you need to alter the `config.json` file.

```javascript
// An array of server configurations
[
    // A configuration for a singular web server
    {
        "root": "/var/www/html", // The path silk will look in when hitting the server route
        "port": 8080, // The port of the server
        "location": "/my-website", // The home location of the server
        "redirectHtmlExtension": false, // Whether or not silk will redirect the user if there is a html file extension included in the url (E.G: /page.html -> /page)
        "headers": { // Set the headers for the server response, any header that is null will delete the response header
            "Server": null // Delete the server response header
        },
        // Redirect paths when an error occurs
        "notFoundPath": "/not-found",
        "internalErrorPath": "/internal-error",
        "forbiddenPath": "/forbidden"

    },
    {
        "proxy": "https://google.com" // Proxy to google.com
    },
    {
        "root": "/var/www/html",
        "allowedFileTypes": ["html"] // Only allow these file types
    },
    {
        "root": "/var/www/html",
        "forbiddenFileTypes": ["txt", "php"] // Allow all file types except these
    }
]
```
