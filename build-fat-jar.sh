#!/bin/bash

# Script to build a fat JAR with all dependencies included

# Ensure JAVA_HOME is set
export JAVA_HOME=$(/usr/libexec/java_home)

echo "Building fat JAR with all dependencies..."

# Clean and package with the fat-jar profile
mvn clean package -P fat-jar

# Check if the build was successful
if [ $? -eq 0 ]; then
    # Find the fat JAR
    FAT_JAR=$(find novadocs-ui-spring-boot-starter/target -name "*-with-dependencies.jar" | head -1)
    
    if [ -n "$FAT_JAR" ]; then
        echo "Successfully built fat JAR:"
        echo "$FAT_JAR"
        
        # Get the size of the JAR
        SIZE=$(du -h "$FAT_JAR" | cut -f1)
        echo "JAR size: $SIZE"
    else
        echo "Fat JAR not found in the target directory."
        echo "Check if the Maven build completed successfully."
    fi
else
    echo "Build failed. Please check the Maven output for errors."
fi
