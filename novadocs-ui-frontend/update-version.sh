#!/bin/bash

# Get the current version from the parent POM
CURRENT_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout -f ../pom.xml)
echo "Current version: $CURRENT_VERSION"

# Update the package.json version
sed -i '' "s/\"version\": \".*\"/\"version\": \"$CURRENT_VERSION\"/" package.json

echo "Version updated successfully to $CURRENT_VERSION"
