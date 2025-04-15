package com.novaDocs.springboot.autoconfigure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;

import java.util.HashMap;
import java.util.Map;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Controller for serving the NovaDocs UI index.html with injected configuration.
 */
@Controller
public class NovaDocsUiIndexController {

    private final NovaDocsUiProperties properties;

    @Value("${springdoc.api-docs.path:/v3/api-docs}")
    private String apiDocsPath;

    public NovaDocsUiIndexController(NovaDocsUiProperties properties) {
        this.properties = properties;
    }

    // Map of file extensions to MIME types
    private static final Map<String, MediaType> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("css", MediaType.valueOf("text/css"));
        MIME_TYPES.put("js", MediaType.valueOf("application/javascript"));
        MIME_TYPES.put("svg", MediaType.valueOf("image/svg+xml"));
        MIME_TYPES.put("html", MediaType.valueOf("text/html"));
        MIME_TYPES.put("json", MediaType.valueOf("application/json"));
        MIME_TYPES.put("png", MediaType.valueOf("image/png"));
        MIME_TYPES.put("jpg", MediaType.valueOf("image/jpeg"));
        MIME_TYPES.put("jpeg", MediaType.valueOf("image/jpeg"));
        MIME_TYPES.put("gif", MediaType.valueOf("image/gif"));
        MIME_TYPES.put("ico", MediaType.valueOf("image/x-icon"));
        MIME_TYPES.put("woff", MediaType.valueOf("font/woff"));
        MIME_TYPES.put("woff2", MediaType.valueOf("font/woff2"));
        MIME_TYPES.put("ttf", MediaType.valueOf("font/ttf"));
        MIME_TYPES.put("eot", MediaType.valueOf("application/vnd.ms-fontobject"));
    }

    /**
     * Handles all requests under the NovaDocs UI path.
     * This includes serving static files if they exist, or falling back to index.html for client-side routing.
     *
     * @param request the HTTP request
     * @return the appropriate response based on the request path
     * @throws IOException if a resource cannot be read
     */
    @GetMapping(value = "${novadocs.ui.path:/novadocs}/**")
    public ResponseEntity<?> handleAllRequests(HttpServletRequest request) throws IOException {
        // Get the request path
        String path = request.getRequestURI();
        String uiPath = properties.getNormalizedPath();

        System.out.println("Handling request for path: " + path);

        // Extract the relative path after the UI path
        String relativePath = path.substring(path.indexOf(uiPath) + uiPath.length());
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }

        // If the path is empty or just "/", serve the index
        if (relativePath.isEmpty() || relativePath.equals("/")) {
            return serveIndex();
        }

        // Try to serve the file directly
        try {
            return serveStaticFile(relativePath);
        } catch (IOException e) {
            // If the file doesn't exist, serve the index.html for client-side routing
            return serveIndex();
        }
    }

    /**
     * Serves the NovaDocs UI HTML page with injected configuration.
     *
     * @return the HTML content with injected configuration
     * @throws IOException if the index.html file cannot be read
     */
    private ResponseEntity<String> serveIndex() throws IOException {
        // Read the index.html file from the webjar
        Resource resource = new ClassPathResource("/META-INF/resources/webjars/novadocs-ui/" + properties.getVersion() + "/index.html");
        try (InputStream inputStream = resource.getInputStream()) {
            String html = StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);

            // Inject the configuration into the HTML
            String configScript = createConfigScript();
            html = html.replace("</head>", configScript + "</head>");

            // Update paths to include the UI path prefix
            String uiPath = properties.getNormalizedPath();

            // Replace relative paths with absolute paths that include the UI path
            html = html.replace("src=\"./", "src=\"" + uiPath + "/");
            html = html.replace("href=\"./", "href=\"" + uiPath + "/");

            // Replace absolute paths with UI-prefixed paths
            html = html.replace("src=\"/", "src=\"" + uiPath + "/");
            html = html.replace("href=\"/", "href=\"" + uiPath + "/");

            // Return the HTML with the correct content type
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(html);
        }
    }

    /**
     * Serves a static file with the correct MIME type.
     *
     * @param relativePath the relative path of the file
     * @return the file content with the correct MIME type
     * @throws IOException if the file cannot be read
     */
    private ResponseEntity<byte[]> serveStaticFile(String relativePath) throws IOException {
        System.out.println("Serving static file: " + relativePath);
        // Determine the file extension
        String extension = getFileExtension(relativePath);

        // Get the appropriate MIME type
        MediaType mediaType = MIME_TYPES.getOrDefault(extension, MediaType.APPLICATION_OCTET_STREAM);

        // Load the file from the classpath
        String resourcePath = "/META-INF/resources/webjars/novadocs-ui/" + properties.getVersion() + "/" + relativePath;
        Resource resource = new ClassPathResource(resourcePath);

        // Read the file content
        byte[] content;
        try (InputStream inputStream = resource.getInputStream()) {
            content = StreamUtils.copyToByteArray(inputStream);
        }

        // Set the appropriate headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setCacheControl("max-age=3600");

        System.out.println("Serving file: " + relativePath + " with content type: " + mediaType);

        return ResponseEntity.ok()
                .headers(headers)
                .body(content);
    }

    /**
     * Gets the file extension from a filename.
     *
     * @param filename the filename
     * @return the file extension
     */
    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex + 1).toLowerCase();
        }
        return "";
    }

    /**
     * Creates a script tag with the configuration.
     *
     * @return the script tag with the configuration
     */
    private String createConfigScript() {
        StringBuilder script = new StringBuilder();
        script.append("<script>\n");
        String uiPath = properties.getNormalizedPath();
        script.append("  window.__NOVADOCS_CONFIG__ = {\n");
        script.append("    basePath: '").append(uiPath).append("',\n");
        script.append("    apiDocsPath: '").append(apiDocsPath).append("',\n");
        script.append("    title: 'API Documentation',\n");

        // Add theme configuration
        script.append("    theme: {\n");
        script.append("      primaryColor: '").append(properties.getTheme().getPrimaryColor()).append("',\n");
        script.append("      secondaryColor: '").append(properties.getTheme().getSecondaryColor()).append("',\n");
        script.append("      fontFamily: '").append(properties.getTheme().getFontFamily()).append("'\n");
        script.append("    },\n");

        // Add layout configuration
        script.append("    layout: {\n");
        script.append("      type: '").append(properties.getLayout().getType()).append("'\n");
        script.append("    }\n");

        script.append("  };\n");
        script.append("</script>\n");

        return script.toString();
    }
}
