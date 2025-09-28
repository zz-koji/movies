#!/bin/bash

# Docker Commands for Movies App
# Usage: ./scripts/docker-commands.sh [command]

case "$1" in
    "dev")
        echo "Starting development environment with watch mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.development up --build --watch
        ;;
    "dev-no-watch")
        echo "Starting development environment without watch mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.development up --build
        ;;
    "prod")
        echo "Starting production environment..."
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up --build
        ;;
    "stop")
        echo "Stopping all containers..."
        docker-compose down
        ;;
    "clean")
        echo "Cleaning up containers and volumes..."
        docker-compose down -v
        docker system prune -f
        ;;
    "logs")
        echo "Showing logs..."
        docker-compose logs -f
        ;;
    "build-server")
        echo "Building server image..."
        docker build -t movies-server ./server
        ;;
    *)
        echo "Usage: $0 {dev|dev-no-watch|prod|stop|clean|logs|build-server}"
        echo ""
        echo "Commands:"
        echo "  dev           - Start development environment with hot reload and watch mode"
        echo "  dev-no-watch  - Start development environment without watch mode"
        echo "  prod          - Start production environment"
        echo "  stop          - Stop all containers"
        echo "  clean         - Stop containers and remove volumes"
        echo "  logs          - Show container logs"
        echo "  build-server  - Build server Docker image"
        exit 1
        ;;
esac