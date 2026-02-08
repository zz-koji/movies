#!/bin/bash
# Sync movies from MinIO to MiniDLNA directory

MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="koji"
MINIO_SECRET_KEY='!emRRXMqsc&ki9o3!'
BUCKET="movies"
DEST_DIR="/home/minio-user/movies"
TEMP_DIR="/tmp/movies-sync-$$"

echo "Syncing movies from MinIO to MiniDLNA..."

# Create temp directory
mkdir -p "$TEMP_DIR"

# Create temp directory for MinIO client config
TMP_MC_DIR=$(mktemp -d)
export MC_CONFIG_DIR="$TMP_MC_DIR"

# Configure MinIO client alias
docker run --rm --network host \
  -v "$TMP_MC_DIR:/root/.mc" \
  minio/mc alias set myminio "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Sync files to temp directory (writable)
echo "Downloading new movies..."
docker run --rm --network host \
  -v "$TMP_MC_DIR:/root/.mc" \
  -v "$TEMP_DIR:/data" \
  minio/mc mirror myminio/$BUCKET /data --overwrite

# Cleanup MinIO config
rm -rf "$TMP_MC_DIR"

# Copy files to final destination with proper permissions
echo "Copying to DLNA directory..."
rsync -av --ignore-existing "$TEMP_DIR/" "$DEST_DIR/"

# Fix ownership
echo "Fixing permissions..."
chown -R minio-user:minio-user "$DEST_DIR"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

# Signal MiniDLNA to rescan
echo "Triggering MiniDLNA rescan..."
killall -HUP minidlnad

echo "✓ Sync complete! New movies should appear on Roku in a minute."
