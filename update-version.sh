#!/bin/bash

# Function to display usage information
show_usage() {
    echo "Usage: $0 [patch|minor|major|<specific-version>]"
    echo ""
    echo "Arguments:"
    echo "  patch               Increment the patch version (e.g., 1.2.3 -> 1.2.4)"
    echo "  minor               Increment the minor version (e.g., 1.2.3 -> 1.3.0)"
    echo "  major               Increment the major version (e.g., 1.2.3 -> 2.0.0)"
    echo "  <specific-version>  Set a specific version (e.g., 2.0.0-SNAPSHOT)"
    echo ""
    echo "Examples:"
    echo "  $0 patch            # Update from 1.2.3-SNAPSHOT to 1.2.4-SNAPSHOT"
    echo "  $0 minor            # Update from 1.2.3-SNAPSHOT to 1.3.0-SNAPSHOT"
    echo "  $0 major            # Update from 1.2.3-SNAPSHOT to 2.0.0-SNAPSHOT"
    echo "  $0 1.5.0-SNAPSHOT   # Set version to 1.5.0-SNAPSHOT"
    exit 1
}

# Check if an argument was provided
if [ $# -ne 1 ]; then
    show_usage
fi

# Get the current version from the parent POM
CURRENT_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
echo "Current version: $CURRENT_VERSION"

# Function to calculate the new version based on the update type
calculate_new_version() {
    local current_version=$1
    local update_type=$2

    # Extract version components
    if [[ $current_version =~ ([0-9]+)\.([0-9]+)\.([0-9]+)(.*) ]]; then
        local major=${BASH_REMATCH[1]}
        local minor=${BASH_REMATCH[2]}
        local patch=${BASH_REMATCH[3]}
        local suffix=${BASH_REMATCH[4]}

        case $update_type in
            patch)
                patch=$((patch + 1))
                ;;
            minor)
                minor=$((minor + 1))
                patch=0
                ;;
            major)
                major=$((major + 1))
                minor=0
                patch=0
                ;;
            *)
                echo "Invalid update type: $update_type"
                exit 1
                ;;
        esac

        echo "$major.$minor.$patch$suffix"
    else
        echo "Error: Could not parse version number: $current_version"
        exit 1
    fi
}

# Determine the new version
if [[ "$1" == "patch" || "$1" == "minor" || "$1" == "major" ]]; then
    NEW_VERSION=$(calculate_new_version "$CURRENT_VERSION" "$1")
else
    NEW_VERSION=$1
fi

echo "Updating project version to $NEW_VERSION"

# Update the version in the parent POM
mvn versions:set -DnewVersion=$NEW_VERSION -DgenerateBackupPoms=false

# No need to update novadocs.ui.version property as it's now read from project.version

# Update the package.json version in the frontend module
cd novadocs-ui-frontend
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
cd ..

echo "Version updated successfully to $NEW_VERSION"
echo "Changes made:"
echo "1. Updated <version> tags in all POMs"
echo "2. Updated version in package.json"
