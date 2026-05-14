# NDIS / Aged Care Roster Server - Deployment Guide

This guide covers deploying the application along with your self-hosted OSRM routing engine on a Linux VPS.

## 1. Prerequisites
Ensure you have Docker and Docker Compose installed on your Linux VPS.
```bash
# Install Docker and Docker Compose (Ubuntu/Debian example)
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
```

## 2. Prepare OSRM Map Data
Before you can run the `docker-compose up`, OSRM needs map data to calculate routes. This application uses "mld" routing. 
For Australia as an example:

```bash
# 1. Create a folder for the OSRM data
mkdir -p osrm-data
cd osrm-data

# 2. Download a regional OpenStreetMap dump (e.g., Australia)
wget http://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf -O map.osm.pbf

# 3. Extract the graph (using Docker so you don't pollute your host)
sudo docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf

# 4. Partition the graph (for MLD)
sudo docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/map.osrm

# 5. Customize the graph (for MLD)
sudo docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/map.osrm

cd ..
```

*(If you only operate in a specific state, like Queensland, use `http://download.geofabrik.de/australia-oceania/australia/queensland-latest.osm.pbf` to save memory and processing time!)*

## 3. Configure the Application
Generate a secure random string for your JWT secret and set it in your `docker-compose.yml`:
```yaml
      - JWT_SECRET=my-very-long-and-secure-random-string
```

Create the persistence directories so Docker mounts them cleanly:
```bash
mkdir -p data uploads invoices
```

## 4. Run the Application
Finally, start up both the app and the OSRM container:
```bash
sudo docker-compose up -d --build
```

You can view the logs with:
```bash
sudo docker-compose logs -f app
```

Once the application is running, you can log in with the default administrator credentials:
- **Email:** `admin@happyinthehome.com`
- **Password:** `password123`

Please change this password immediately after your first login for security purposes.

## Maintenance & Backups
Since we configured Docker to use volumes mapped to your VPS file system:
- **Database:** `data/database.sqlite` (The primary database file. **Note:** SQLite WAL mode creates `database.sqlite-wal` and `database.sqlite-shm` files. Back up the entire `data` folder).
- **Uploads:** `uploads/`
- **Invoices:** `invoices/`

To backup, simply tar these directories!
