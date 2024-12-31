# Project Documentation

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
  - [Copy `.env` Files](#copy-env-files)
  - [Adjust Environment Variables](#adjust-environment-variables)
- [Server Setup](#server-setup)
  - [Installing Docker](#installing-docker)
  - [Setting Up SSH Access](#setting-up-ssh-access)
- [Running the Project](#running-the-project)
  - [Running Locally](#running-locally)
  - [Running on Development Server](#running-on-development-server)
  - [Running in Production](#running-in-production)
- [Deployment Scripts](#deployment-scripts)
  - [Using `setup.sh`](#using-setupsh)
  - [Examples](#examples)
- [Additional Information](#additional-information)
  - [Scripts and Commands](#scripts-and-commands)
  - [Notes on Environment Variables](#notes-on-environment-variables)
- [Notes](#notes)

## Prerequisites

- **Node.js** (version specified in `package.json` under `volta.node`: `18.18.2`)
- **Docker** and **Docker Compose**
- **PostgreSQL** (if not using Docker for the database)
- **Git**

## Environment Setup

Before running the project, you need to set up the environment variables and configuration files.

### Copy `.env` Files

Copy the example environment files to create your own configuration:

1. **Root Directory**:

   ```bash
   cp .env.example .env
   ```

2. **Docker Directory**:

   ```bash
   cp docker/.env.example docker/.env
   ```

3. **SSH Configuration** (for deployment scripts):

   ```bash
   cp .ssh.example.env .ssh.dev.env
   cp .ssh.example.env .ssh.prod.env
   ```

### Adjust Environment Variables

- **Root `.env` File**:

  Adjust the connection string in your root `.env` file to match your local database settings.

  For example, if you are using PostgreSQL running on Docker, the port is `55674` on the host:

  ```env
  DATABASE_URL="postgresql://user:password@localhost:55674/my_app?schema=public"
  ```

- **Docker `.env` File**:

  Customize environment variables for Docker services. The `.env.example` in the Docker folder can be used as a template. Ensure consistency with the settings in `docker-compose.yaml`.

- **SSH Environment Files**:

  Fill in the `SSH_HOST`, `SSH_USER`, `SSH_KEY`, and `REMOTE_PROJECT_PATH` in `.ssh.dev.env` and `.ssh.prod.env`.

  ```env
  SSH_HOST=your.server.com
  SSH_USER=deploy
  SSH_KEY=/path/to/ssh/key
  REMOTE_PROJECT_PATH=/path/to/project
  ```

## Server Setup

### Installing Docker

To prepare your server for deployment, you need to install Docker and Docker Compose. Follow the official Docker documentation for your specific operating system:

- [Install Docker Engine](https://docs.docker.com/engine/install/)

Typically, this involves downloading the Docker installation package and running the installer. After installation, ensure that the Docker daemon is running.

### Setting Up SSH Access

To allow secure access to your server, you'll need to set up SSH keys. Here's how:

1.  **Generate an SSH Key Pair**:

    On your local machine, generate a new SSH key pair using the following command:

    ```bash
    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
    ```

    This will create a private key (`id_rsa`) and a public key (`id_rsa.pub`) in the `~/.ssh` directory.

2.  **Copy the Public Key to the Server**:

    Use `ssh-copy-id` to copy the public key to the server. Replace `user@your_server_ip` with your server's username and IP address:

    ```bash
    ssh-copy-id user@your_server_ip
    ```

    You may be prompted for your server password the first time.

3.  **Add the Public Key Manually (if `ssh-copy-id` fails)**:

    If `ssh-copy-id` doesn't work, you can manually add the public key to the `~/.ssh/authorized_keys` file on the server:

    ```bash
    # On your local machine, copy the public key
    cat ~/.ssh/id_rsa.pub

    # On the server, add the public key to authorized_keys
    mkdir -p ~/.ssh
    nano ~/.ssh/authorized_keys
    # Paste the public key into the file, save and exit
    ```

4.  **Test SSH Access**:

    Try logging into the server using SSH:

    ```bash
    ssh user@your_server_ip
    ```

    If successful, you should be logged in without needing a password.

## Running the Project

### Running Locally

1. **Start the Database**

   If you need PostgreSQL running locally and prefer using Docker, start the database service:

   ```bash
   docker compose -f docker/docker-compose.yaml up postgres
   ```

   > **Note**: This starts only the PostgreSQL service defined in the `docker-compose.yaml` file.

2. **Adjust the Connection String**

   Ensure the `DATABASE_URL` in your root `.env` file matches the running database. Use port `55674` if using the Dockerized PostgreSQL:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:55674/my_app?schema=public"
   ```

3. **Copy and Adjust Environment Files**

   Copy the `.env.example` file to `.env` in the root directory:

   ```bash
   cp .env.example .env
   ```

   Adjust any other environment variables as needed in the `.env` file.

4. **Install Dependencies**

   Install project dependencies:

   ```bash
   npm install
   ```

5. **Run Database Migrations**

   Apply database migrations using Prisma:

   ```bash
   npm run migrate:dev
   ```

6. **Start the Development Servers**

   To start both the backend and frontend servers with one command:

   ```bash
   npm run start:dev
   ```

   > This command runs the script from `package.json` that serves both the backend and frontend concurrently.

   ```json
   "scripts": {
     "start:dev": "nx run-many --parallel --target=serve --projects=backend,frontend"
   }
   ```

7. **Access the Application**

   - **Frontend**: Usually runs on `http://localhost:4200`.
   - **Backend**: Runs on `http://localhost:3000`.

### Running on Development Server

1. **Ensure Environment Files are Set**

   - Copy and adjust `.env` files as per the [Environment Setup](#environment-setup) section.
   - Ensure `.ssh.dev.env` is configured with your development server details.

2. **Start All Services with Docker Compose**

   On the development server, run:

   ```bash
   docker compose -f docker/docker-compose.yaml up --build
   ```

   This command will build and start all services defined in `docker-compose.yaml`:

   - **Caddy**: Web server and reverse proxy.
   - **Postgres**: Database service.
   - **Backend**: Backend application.
   - **Frontend**: Frontend application.

3. **Verify Services**

   - Ensure all containers are running without errors.
   - Check application logs if necessary.

### Running in Production

1. **Prepare Environment Files**

   - Copy `.env.example` files and configure them appropriately for production.
   - Use `.ssh.prod.env` for deployment configurations.

2. **Start Services**

   On the production server, start services with Docker Compose:

   ```bash
   docker compose -f docker/docker-compose.yaml up --build -d
   ```

   > The `-d` flag runs the containers in detached mode.

3. **Configure Domain and SSL**

   - Update `DOMAIN` and `ACME_EMAIL` in `docker/.env`:

     ```env
     DOMAIN=yourdomain.com
     ACME_EMAIL=your-email@example.com
     ```

   - Ensure DNS A records point to your server.

   - Caddy will handle SSL certificate generation via Let's Encrypt.

4. **Verify Application**

   - Access your application at `https://yourdomain.com`.
   - Monitor logs for any issues.

## Deployment Scripts

### Using `setup.sh`

The `setup.sh` script automates deployment tasks to development or production servers.

```bash
./setup.sh [command] [--dev|--prod]
```

#### Commands

- `update`: Update existing installation on the server.
- `status`: Check services status on the server.
- `logs [service]`: View logs from the remote server (optional: specify service name).

#### Environments

- `--dev`: Deploy to development environment (default).
- `--prod`: Deploy to production environment.

#### Configuration

- Ensure `.ssh.dev.env` or `.ssh.prod.env` is correctly filled, based on `.ssh.example.env`.

  ```env
  SSH_HOST=your.server.com
  SSH_USER=deploy
  SSH_KEY=/path/to/ssh/key
  REMOTE_PROJECT_PATH=/path/to/project
  ```

### Examples

- **Update Application on Development Server**:

  ```bash
  ./setup.sh update --dev
  ```

- **Update Application on Production Server**:

  ```bash
  ./setup.sh update --prod
  ```

- **Check Service Status on Development Server**:

  ```bash
  ./setup.sh status --dev
  ```

- **View Logs of Backend Service on Production Server**:

  ```bash
  ./setup.sh logs backend --prod
  ```

## Additional Information

### Scripts and Commands

The `package.json` file contains various scripts for project operations.

```json
{
  "scripts": {
    "start:dev": "nx run-many --parallel --target=serve --projects=backend,frontend",
    "backend:dev": "nx run backend:serve",
    "frontend:dev": "nx run frontend:serve",
    "migrate:dev": "prisma migrate dev",
    "docker:env": "docker compose --file docker/docker-compose.yaml up --build"
    // Other scripts...
  }
}
```

- **Start Backend in Development**:

  ```bash
  npm run backend:dev
  ```

- **Start Frontend in Development**:

  ```bash
  npm run frontend:dev
  ```

- **Run Database Migrations**:

  ```bash
  npm run migrate:dev
  ```

- **Build and Start Services with Docker**:

  ```bash
  npm run docker:env
  ```

# Notes on Environment Variables

- **Root vs. Docker `.env` Files**:

  - The root `.env` is used when running the application outside of Docker.
  - The Docker `.env` contains variables specific to Docker services.

- **Adjusting Variables**:

  - Ensure ports and URLs are consistent across services.
  - Update secrets and API keys with secure values.

## Notes

- **Database Port Conflict**:

  - The PostgreSQL service in Docker maps port `5432` inside the container to `55674` on the host.
  - If you have a local PostgreSQL instance running on `5432`, ensure there's no conflict.

- **Prisma Migrations**:

  - Run migrations after starting the database but before starting the application.

- **Caddy Server**:

  - Handles SSL termination and reverse proxying.
  - Configure `Caddyfile` as needed for your domain and services (normally its automaticaly handled if you set the Domain in .env)

- **Docker Compose Services**:

  - In development, you can start only the necessary services (e.g., only PostgreSQL).
  - In production, all services should be running via Docker Compose.

- **SSH Deployment**:

  - The `setup.sh` script uses SSH to connect to servers.
  - Ensure SSH keys are properly configured and the `SSH_KEY` path is correct.
