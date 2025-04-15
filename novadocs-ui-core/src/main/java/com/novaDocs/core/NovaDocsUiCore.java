package com.novaDocs.core;

/**
 * Main entry point for the NovaDocs UI Core functionality.
 * This class will contain the core logic for rendering the OpenAPI specification.
 */
public class NovaDocsUiCore {

    // Version is read from the parent POM
    private static final String VERSION = "${project.version}";

    /**
     * Get the current version of NovaDocs UI.
     *
     * @return the version string
     */
    public static String getVersion() {
        return VERSION;
    }
}
