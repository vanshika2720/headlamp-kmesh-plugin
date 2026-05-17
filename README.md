# headlamp-kmesh-plugin-temp

This is the default template README for [Headlamp Plugins](https://github.com/kubernetes-sigs/headlamp).

- The description of your plugin should go here.
- You should also edit the package.json file meta data (like name and description).

## Developing Headlamp plugins

For more information on developing Headlamp plugins, please refer to:

- [Getting Started](https://headlamp.dev/docs/latest/development/plugins/), How to create a new Headlamp plugin.
- [API Reference](https://headlamp.dev/docs/latest/development/api/), API documentation for what you can do
- [UI Component Storybook](https://headlamp.dev/docs/latest/development/frontend/#storybook), pre-existing components you can use when creating your plugin.
- [Plugin Examples](https://github.com/kubernetes-sigs/headlamp/tree/main/plugins/examples), Example plugins you can look at to see how it's done.

# Headlamp Kmesh Plugin

A Headlamp plugin for visualizing and managing Kmesh resources directly inside the Kubernetes UI.

This plugin is being developed as part of the CNCF Kmesh + Headlamp integration effort to reduce context switching between:
- `kubectl`
- CLI debugging tools
- Headlamp dashboard workflows

---

# Features

## Current MVP Features

- Kmesh sidebar integration inside Headlamp
- Kmesh Overview dashboard
- Cluster detection and empty-state handling
- Kmesh deployment status visibility
- Namespace redirection management UI

### Placeholder architecture for future integrations

- `/debug/ready`
- eBPF program visibility
- XDS stream health
- Kmesh CRDs
- Waypoints and policy inspection

---

# Tech Stack

- React
- TypeScript
- Headlamp Plugin SDK
- Kubernetes API
- Vite

---

# Local Development

## Prerequisites

- Node.js
- npm
- Docker Desktop
- Kubernetes cluster (`kind` or `minikube`)
- Headlamp desktop application

---

# Install Headlamp

## macOS

```bash
brew install --cask headlamp
```

---

# Start Kubernetes Cluster

```bash
kind create cluster --name kmesh
```

## Verify cluster

```bash
kubectl cluster-info
kubectl get nodes
```

---

# Plugin Setup

## Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/headlamp-kmesh-plugin.git
cd headlamp-kmesh-plugin
```

---

## Install dependencies

```bash
npm install
```

---

## Create plugin directory

```bash
mkdir -p ~/Library/Preferences/Headlamp/plugins/headlamp-kmesh-plugin
```

---

## Run development server

```bash
npm start
```

---

# Open Headlamp

Launch Headlamp:

```bash
open -a Headlamp
```

Select your Kubernetes cluster.

You should see a new sidebar item:

```text
Kmesh
```

---

# Current Status

This MVP currently works without requiring a full Kmesh runtime deployment.

If Kmesh is not installed in the cluster, the dashboard gracefully shows:

```text
Not Deployed
0 / 0 Daemons
```

---

# Planned Features

- Real Kmesh daemon discovery
- `/debug/ready` integration
- eBPF map visibility
- XDS stream health monitoring
- Kmesh CRD support
- Waypoint visualization
- Service and policy inspection
- Real-time logs and metrics

---

## Screenshots

### Kmesh Dashboard

<img width="1087" height="624" alt="Screenshot 2026-05-17 at 5 32 07 PM" src="https://github.com/user-attachments/assets/311a2b4a-4a91-477b-95da-04ca84551150" />


### Active Kubernetes Cluster


<img width="1130" height="623" alt="Screenshot 2026-05-17 at 5 32 29 PM" src="https://github.com/user-attachments/assets/1e657e94-0ccc-4666-89c0-48e8da92446e" />


### Cluster Runtime Overview

<img width="1086" height="621" alt="Screenshot 2026-05-17 at 5 33 23 PM" src="https://github.com/user-attachments/assets/ded5f99f-53fa-4d3c-b98d-2ac85c2c2d5d" />


### Project Structure

<img width="360" height="633" alt="Screenshot 2026-05-17 at 5 33 52 PM" src="https://github.com/user-attachments/assets/562aaed6-f10b-416a-8522-a86b5dbcc6e5" />


---

# Project Goal

This project aims to provide lightweight operational visibility for Kmesh directly inside Headlamp while keeping the full Kmesh dashboard available for advanced operations.

The long-term goal is to improve:
- Mesh observability
- Kubernetes-native workflows
- Operational debugging
- Day-to-day Kmesh management experience

without forcing users to switch between multiple tooling environments.
