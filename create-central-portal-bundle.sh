#!/bin/bash

# Script to create a properly formatted bundle for Central Portal upload
# This script does NOT use OSSRH for deployment

# Ensure JAVA_HOME is set
export JAVA_HOME=$(/usr/libexec/java_home)

# Define properties file path
PROPERTIES_FILE="maven-deploy.properties"

mvn clean

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
    echo "GPG is not installed. Please install it first."
    exit 1
fi

# Check if GPG key exists
if ! gpg --list-secret-keys | grep -q "sec"; then
    echo "No GPG key found. Please generate a GPG key first."
    echo "Run: gpg --gen-key"
    exit 1
fi

# Check if properties file exists
if [ ! -f "$PROPERTIES_FILE" ]; then
    echo "Properties file $PROPERTIES_FILE not found."
    echo "Using default GPG configuration."
    GPG_PASSPHRASE=""
else
    # Function to read a property from the properties file
    function get_property {
        grep "^$1=" "$PROPERTIES_FILE" | cut -d'=' -f2-
    }

    # Read GPG passphrase
    GPG_PASSPHRASE=$(get_property "gpg.passphrase")
    
    if [ -n "$GPG_PASSPHRASE" ] && [ "$GPG_PASSPHRASE" != "YOUR_GPG_PASSPHRASE" ]; then
        echo "Using GPG passphrase from properties file."
    else
        echo "No valid GPG passphrase found in properties file."
        echo "You may be prompted for your GPG passphrase during signing."
        GPG_PASSPHRASE=""
    fi
    
    # Export GPG TTY for passphrase prompting if needed
    export GPG_TTY=$(tty)
fi

# First, make sure we have the fat JAR
echo "Checking for fat JAR..."
FAT_JAR=$(find novadocs-ui-spring-boot-starter/target -name "*-with-dependencies.jar" | head -1)

if [ -z "$FAT_JAR" ]; then
    echo "Fat JAR not found. Building it first..."
    ./build-fat-jar.sh
    
    # Check again for the fat JAR
    FAT_JAR=$(find novadocs-ui-spring-boot-starter/target -name "*-with-dependencies.jar" | head -1)
    
    if [ -z "$FAT_JAR" ]; then
        echo "Failed to build fat JAR. Exiting."
        exit 1
    fi
fi

echo "Using fat JAR: $FAT_JAR"

# Extract version from the fat JAR filename
SNAPSHOT_VERSION=$(echo "$FAT_JAR" | sed -E 's/.*novadocs-ui-spring-boot-starter-([0-9]+\.[0-9]+\.[0-9]+(-SNAPSHOT)?).*/\1/')
echo "Detected version: $SNAPSHOT_VERSION"

# Remove -SNAPSHOT suffix for Maven Central (which doesn't accept snapshots)
VERSION=$(echo "$SNAPSHOT_VERSION" | sed 's/-SNAPSHOT//')
echo "Using release version for Maven Central: $VERSION"

# Define artifact base name and paths
ARTIFACT_BASE="novadocs-ui"
GROUP_ID="io.github.rohitect"
ARTIFACT_ID="$ARTIFACT_BASE"
GROUP_PATH=$(echo "$GROUP_ID" | tr '.' '/')

# Create a temporary directory for the bundle
BUNDLE_DIR="target/central-portal-bundle"
echo "Creating bundle directory..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION"

# Copy the fat JAR to the bundle directory with the correct name
echo "Copying fat JAR to bundle directory..."
cp "$FAT_JAR" "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION.jar"

# Create a minimal POM file
echo "Creating POM file..."
cat > "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION.pom" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>$GROUP_ID</groupId>
    <artifactId>$ARTIFACT_ID</artifactId>
    <version>$VERSION</version>
    <packaging>jar</packaging>

    <name>NovaDocs UI</name>
    <description>A complete JAR containing all dependencies for NovaDocs UI - ready to use without additional dependencies</description>
    <url>https://github.com/rohitect/springdoc-nova-ui</url>

    <licenses>
        <license>
            <name>MIT License</name>
            <url>https://opensource.org/licenses/MIT</url>
            <distribution>repo</distribution>
        </license>
    </licenses>

    <developers>
        <developer>
            <name>Rohit Ranjan</name>
            <email>91.rohit@gmail.com</email>
            <organizationUrl>https://github.com/rohitect</organizationUrl>
        </developer>
    </developers>

    <scm>
        <connection>scm:git:git://github.com/rohitect/springdoc-nova-ui.git</connection>
        <developerConnection>scm:git:ssh://github.com:rohitect/springdoc-nova-ui.git</developerConnection>
        <url>https://github.com/rohitect/springdoc-nova-ui</url>
    </scm>
</project>
EOF

# Create empty javadoc JAR
echo "Creating empty javadoc JAR..."
TEMP_DIR="target/temp-javadoc"
mkdir -p "$TEMP_DIR"
touch "$TEMP_DIR/README.txt"
echo "This is a complete JAR containing all dependencies for NovaDocs UI.\n\nFor documentation, please visit: https://github.com/rohitect/springdoc-nova-ui\n\nVersion: $VERSION" > "$TEMP_DIR/README.txt"
jar -cf "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION-javadoc.jar" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# Create empty sources JAR
echo "Creating empty sources JAR..."
TEMP_DIR="target/temp-sources"
mkdir -p "$TEMP_DIR"
touch "$TEMP_DIR/README.txt"
echo "This is a complete JAR containing all dependencies for NovaDocs UI.\n\nFor source code, please visit: https://github.com/rohitect/springdoc-nova-ui\n\nVersion: $VERSION" > "$TEMP_DIR/README.txt"
jar -cf "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION/$ARTIFACT_ID-$VERSION-sources.jar" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# Generate checksums
echo "Generating checksums..."
cd "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION"
for file in *.jar *.pom; do
    if [[ -f "$file" ]]; then
        echo "Generating checksums for $file..."
        # Generate MD5 checksum
        md5sum "$file" | cut -d' ' -f1 > "$file.md5"
        
        # Generate SHA1 checksum
        shasum -a 1 "$file" | cut -d' ' -f1 > "$file.sha1"
    fi
done
cd - > /dev/null

# Sign all the artifacts
echo "Signing artifacts..."
cd "$BUNDLE_DIR/$GROUP_PATH/$ARTIFACT_ID/$VERSION"
for file in *.jar *.pom; do
    if [[ -f "$file" ]]; then
        echo "Signing $file..."
        if [ -n "$GPG_PASSPHRASE" ]; then
            echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 --detach-sign --armor "$file"
        else
            gpg --batch --yes --detach-sign --armor "$file"
        fi
        
        # Verify the signature
        echo "Verifying signature for $file..."
        gpg --verify "$file.asc" "$file"
    fi
done
cd - > /dev/null

# Create the zip file for Central Portal upload
echo "Creating zip file for Central Portal upload..."
ZIP_FILE="target/$ARTIFACT_ID-$VERSION-central-portal.zip"
rm -f "$ZIP_FILE"
(cd "$BUNDLE_DIR" && zip -r "../$(basename "$ZIP_FILE")" .)

if [ -f "$ZIP_FILE" ]; then
    echo "Successfully created zip file for Central Portal upload:"
    echo "$ZIP_FILE"
    echo ""
    echo "To upload this file to Maven Central Portal:"
    echo "1. Go to https://central.sonatype.org/publish/publish-portal-upload/"
    echo "2. Log in to the Sonatype Portal"
    echo "3. Click on 'Upload Artifacts' and select the zip file"
    echo "4. Follow the instructions to complete the upload process"
    
    # Open the Central Portal upload page
    echo ""
    echo "Would you like to open the Central Portal upload page now? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        open "https://central.sonatype.org/publish/publish-portal-upload/"
    fi
else
    echo "Failed to create the zip file."
fi
