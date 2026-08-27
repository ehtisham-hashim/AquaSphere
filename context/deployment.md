# AquaSphere Deployment & VPS Hosting Guide

## Table of Contents

- [Stack Overview](#stack-overview)
- [Server Requirements](#server-requirements)
- [VPS Providers Ranked](#vps-providers-ranked-best-value--premium)
- [Price Comparison Summary](#price-comparison-summary)
- [Convenience Trade-offs: DigitalOcean/Vultr vs Contabo](#convenience-trade-offs-digitaloceanvultr-vs-contabo)
- [Final Recommendation](#final-recommendation)
- [Deploy Stack on Your VPS](#deploy-stack-on-your-vps)
- [Day 1 Security Checklist](#day-1-security-checklist)

---

## Stack Overview

| Layer            | Technology                                      |
| :--------------- | :---------------------------------------------- |
| **Backend**      | Node.js (Express 5)                             |
| **Database**     | PostgreSQL (via Prisma ORM)                     |
| **Frontend**     | React 19 + Vite (static build → CDN or VPS)     |
| **File Storage** | Cloudinary (external — no local disk pressure)  |
| **Other**        | PDF generation (PDFKit), JWT auth, rate limiting |

---

## Server Requirements

| Resource      | Minimum       | Recommended       |
| :------------ | :------------ | :---------------- |
| **RAM**       | 2 GB          | 4 GB              |
| **vCPU**      | 1 core        | 2 cores           |
| **Storage**   | 20 GB NVMe SSD | 50 GB NVMe SSD   |
| **Bandwidth** | 1 TB/mo       | 4 TB/mo           |
| **OS**        | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

> **Note:** Since Cloudinary handles file storage and the frontend is a static Vite build, the server's main job is running the Express API + PostgreSQL. This is a relatively lightweight workload — you don't need a beefy server.

---

## VPS Providers Ranked (Best Value → Premium)

### 1. 🥇 Contabo — Best Bang for Buck (RECOMMENDED)

| Spec          | Cloud VPS 4                                |
| :------------ | :----------------------------------------- |
| **vCPU**      | 4 cores                                   |
| **RAM**       | 8 GB                                      |
| **Storage**   | 100 GB NVMe SSD                           |
| **Bandwidth** | 32 TB/mo                                  |
| **Price**     | **~€5.24/mo** (~$5.70/mo) on 24-mo plan   |

**Why Contabo for AquaSphere:**

- You get **4 vCPU + 8 GB RAM for ~$6/mo** — absurd value
- More than enough for Node.js + PostgreSQL + serving React static files
- 32 TB bandwidth means you'll never worry about overages
- NVMe SSD ensures fast PostgreSQL query times

**Trade-offs:**

- Unmanaged — you set up everything yourself (Ubuntu, Node, PostgreSQL, Nginx, SSL)
- Network latency can feel slightly less snappy than Hetzner
- Support response times are slower (days, not hours)
- Data centers: EU (Germany), US, Asia, Australia

> **Tip:** For a water distribution business like AquaSphere, where traffic is internal/employee-facing with low concurrent users, Contabo's slight latency trade-off is **completely irrelevant**. You're getting 4× the specs of competitors at the same price.

---

### 2. 🥈 Hetzner — Best Performance per Dollar

| Spec          | CX23 (Shared) | CAX11 (ARM64) |
| :------------ | :------------ | :------------ |
| **vCPU**      | 2 cores       | 2 cores       |
| **RAM**       | 4 GB          | 4 GB          |
| **Storage**   | 40 GB NVMe    | 40 GB NVMe    |
| **Bandwidth** | 20 TB/mo      | 20 TB/mo      |
| **Price**     | **€5.49/mo**  | **~€4.49/mo** |

**Why Hetzner:**

- Superior network quality and consistent I/O performance
- 20 TB free egress (massive)
- Excellent developer-focused API and CLI
- ARM64 (CAX) plans are even cheaper — Node.js runs perfectly on ARM

**Trade-offs:**

- After the June 2026 price hikes, the CX/CAX lines cost ~33-38% more than before
- Dedicated vCPU (CPX) plans got expensive (113-176% increase)
- EU data centers primarily (Falkenstein, Nuremberg, Helsinki) + Ashburn, US
- Strict signup verification (some regions face issues)

> **Important:** If you're in Pakistan, Hetzner's signup verification can be tricky — they sometimes flag non-EU signups. Have your ID ready. Contabo has a smoother onboarding process globally.

---

### 3. 🥉 Hostinger — Best for Beginners

| Spec          | KVM 1            | KVM 2            |
| :------------ | :--------------- | :--------------- |
| **vCPU**      | 1 core           | 2 cores          |
| **RAM**       | 4 GB             | 8 GB             |
| **Storage**   | 50 GB NVMe       | 100 GB NVMe      |
| **Bandwidth** | 4 TB/mo          | 8 TB/mo          |
| **Price**     | **~$4.99/mo** (promo) | **~$6.49/mo** (promo) |

**Why Hostinger:**

- AI-powered server management panel (easiest to use)
- Good for those less comfortable with raw Linux terminal
- Weekly backups included
- Global data centers

**Trade-offs:**

- ⚠️ **Renewal prices jump 140-232%** after the promo period
- That $4.99/mo KVM 1 becomes ~$12-16/mo on renewal
- Less raw performance than Contabo/Hetzner at equal specs

> **Warning:** The promo pricing is deceptive. Calculate the **renewal price** before committing. On a 2-year renewal, Hostinger can end up more expensive than Contabo/Hetzner for the same specs.

---

### 4. DigitalOcean — Best Developer Experience (Premium)

| Spec          | Basic Droplet | Regular Droplet |
| :------------ | :------------ | :-------------- |
| **vCPU**      | 1 core        | 2 cores         |
| **RAM**       | 2 GB          | 4 GB            |
| **Storage**   | 50 GB SSD     | 80 GB SSD       |
| **Bandwidth** | 2 TB/mo       | 4 TB/mo         |
| **Price**     | **$18/mo**    | **$24/mo**      |

**Why DigitalOcean:**

- Best documentation in the industry
- One-click Node.js / PostgreSQL droplets
- Managed databases option (PostgreSQL)
- Beautiful, intuitive control panel
- Massive tutorial library

**Trade-offs:**

- **3-4× more expensive** than Contabo for similar specs
- Egress overages can add up
- You're paying for convenience, not raw performance

---

### 5. Vultr — Best Global Reach

| Spec          | Cloud Compute |
| :------------ | :------------ |
| **vCPU**      | 2 cores       |
| **RAM**       | 4 GB          |
| **Storage**   | 100 GB SSD    |
| **Bandwidth** | 3 TB/mo       |
| **Price**     | **$24/mo**    |

**Why Vultr:**

- 32+ data center locations worldwide
- Bare metal and GPU options for future scaling
- Good API

**Trade-offs:**

- Premium pricing similar to DigitalOcean
- No significant advantage over DO for AquaSphere's use case

---

## Price Comparison Summary

| Provider         | Plan            | vCPU | RAM  | Storage | Monthly Cost       |
| :--------------- | :-------------- | :--: | :--: | :-----: | :----------------: |
| **Contabo** 🥇   | Cloud VPS 4     |  4   | 8 GB | 100 GB  | **~$6/mo**         |
| **Hetzner** 🥈   | CAX11 (ARM)     |  2   | 4 GB |  40 GB  | **~$5/mo**         |
| **Hetzner**      | CX23 (x86)     |  2   | 4 GB |  40 GB  | **~$6/mo**         |
| **Hostinger**    | KVM 2           |  2   | 8 GB | 100 GB  | **~$7/mo** (promo) |
| **DigitalOcean** | Basic Droplet   |  1   | 2 GB |  50 GB  | **$18/mo**         |
| **Vultr**        | Cloud Compute   |  2   | 4 GB | 100 GB  | **$24/mo**         |

---

## Convenience Trade-offs: DigitalOcean/Vultr vs Contabo

### Managed Databases

| Feature              | DigitalOcean / Vultr                                                    | Contabo                                                       |
| :------------------- | :---------------------------------------------------------------------- | :------------------------------------------------------------ |
| PostgreSQL setup     | One-click managed DB — they handle backups, failover, updates           | You install, configure, secure, and backup PostgreSQL yourself |
| If DB crashes at 3AM | Auto-heals, you sleep peacefully                                        | Your app is down until you SSH in and fix it                   |
| Automatic backups    | Daily, with point-in-time recovery                                      | You write a `pg_dump` cron job yourself                       |

### One-Click App Deployments

| Feature       | DigitalOcean / Vultr                                      | Contabo                                        |
| :------------ | :-------------------------------------------------------- | :--------------------------------------------- |
| Node.js setup | Pre-built "1-Click App" — Node, Nginx, PM2 pre-configured | Blank Ubuntu. You install everything from scratch |
| Firewall      | GUI-based cloud firewall                                   | You configure `ufw` via terminal               |
| SSL/HTTPS     | Managed load balancer handles it                           | You set up Certbot + Nginx yourself             |

### Dashboard & Monitoring

| Feature         | DigitalOcean / Vultr                         | Contabo                                       |
| :-------------- | :------------------------------------------- | :-------------------------------------------- |
| Resource graphs | Built-in, real-time, pretty charts           | Nothing. Install Grafana/htop yourself         |
| Alerts          | "Email me if CPU > 80%" — built in           | Set up your own monitoring (UptimeRobot etc.)  |
| Console access  | In-browser terminal, VNC console             | Basic VNC, less polished                       |

### Snapshots & Backups

| Feature           | DigitalOcean / Vultr                        | Contabo                         |
| :---------------- | :------------------------------------------ | :------------------------------ |
| Server snapshots  | One-click, instant, from the dashboard      | Manual, limited, or paid add-on |
| Automated backups | Toggle on → weekly backups for ~20% extra    | DIY with scripts                |
| Restore           | Click "Restore" → done in minutes           | Manual restore process          |

### Networking & Scaling

| Feature          | DigitalOcean / Vultr                       | Contabo                                  |
| :--------------- | :----------------------------------------- | :--------------------------------------- |
| Load balancers   | Managed, $12/mo                            | Not available                            |
| Private network  | Free VPC between your servers              | Basic, less flexible                     |
| Resize server    | Click "Resize" → 2 minutes, zero downtime | Create new server, migrate manually       |
| Floating IPs     | Free, instant failover                     | Not available                            |

### Documentation & Community

| Feature       | DigitalOcean                                                              | Contabo         |
| :------------ | :------------------------------------------------------------------------ | :-------------- |
| Tutorials     | Thousands of step-by-step guides ("How to install Node.js on Ubuntu")     | Almost nothing  |
| Community Q&A | Active forum                                                              | Minimal         |
| Support       | Ticket response in hours                                                  | Ticket response in **days** |

### Does AquaSphere Need These Conveniences?

**No.** Here's why:

| Convenience Feature    | Why AquaSphere Doesn't Need It                                                                            |
| :--------------------- | :-------------------------------------------------------------------------------------------------------- |
| Managed Database       | Small user base (employees). A `pg_dump` cron job running nightly is perfectly fine                       |
| One-click deploy       | You set it up **once**. After that first 2-3 hours of setup, you never touch it again                      |
| Monitoring dashboard   | `htop` + a free UptimeRobot account gives you the same thing                                              |
| Auto-scaling           | A water distribution business isn't getting traffic spikes. Your traffic is predictable                    |
| Snapshots              | A weekly backup script takes 5 lines of bash                                                              |

### The Math

```
DigitalOcean (2 vCPU, 4 GB RAM):   $24/mo × 12 = $288/year
Contabo     (4 vCPU, 8 GB RAM):     $6/mo × 12 =  $72/year
                                                   ─────────
                            You save:               $216/year
                            And get:                 2× the specs
```

You'd be paying **$216/year extra** for a pretty dashboard and one afternoon of saved setup time. That's not value — that's a luxury tax.

---

## Final Recommendation

### Go with Contabo Cloud VPS 4

```
   Contabo Cloud VPS 4
   ┌──────────────────────────────────────────────────┐
   │  4 vCPU  │  8 GB RAM  │  100 GB NVMe  │  ~$6/mo │
   └──────────────────────────────────────────────────┘
               │
               ├── Node.js (Express 5 API)      ✅ Plenty of headroom
               ├── PostgreSQL (Prisma)           ✅ 8GB RAM = fast queries
               ├── Nginx (reverse proxy + SSL)   ✅ Serves React build
               ├── PM2 (process manager)         ✅ Auto-restart on crash
               └── Certbot (free SSL)            ✅ HTTPS for free
```

**For ~$6/month you get:**

- ✅ **4 vCPU** — overkill for your workload, which is great (room to grow)
- ✅ **8 GB RAM** — PostgreSQL loves RAM for caching; Node.js will use ~200-400MB
- ✅ **100 GB NVMe** — your DB won't exceed 5-10 GB for years
- ✅ **32 TB bandwidth** — practically unlimited for an internal business app

**Your annual cost:** ~$72/year for the entire backend infrastructure.

### Recommended Architecture

| Component    | Where                    | Cost        |
| :----------- | :----------------------- | :---------- |
| **Backend**  | Contabo VPS              | ~$6/mo      |
| **Frontend** | Vercel (free tier)       | $0/mo       |
| **Files**    | Cloudinary (free tier)   | $0/mo       |
| **Total**    |                          | **~$6/mo**  |

---

## Deploy Stack on Your VPS

Once you provision the Contabo VPS, install these components:

| Component            | Purpose                                            |
| :------------------- | :------------------------------------------------- |
| **Ubuntu 24.04 LTS** | Operating system                                   |
| **Node.js 22 LTS**   | Runtime for Express backend                        |
| **PostgreSQL 17**    | Database                                            |
| **Nginx**            | Reverse proxy, SSL termination, serve static files |
| **PM2**              | Keep Node.js running, auto-restart on crash        |
| **Certbot**          | Free Let's Encrypt SSL certificates                |
| **UFW**              | Firewall (allow only ports 80, 443, 22)            |

---

## Day 1 Security Checklist

> **Caution:** Regardless of which VPS you choose, always complete these steps immediately after provisioning:

1. **Disable root SSH login** — Create a non-root user with sudo privileges
2. **Use SSH key authentication** — Disable password-based SSH entirely
3. **Enable UFW firewall** — Allow only ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
4. **Set up automated PostgreSQL backups** — `pg_dump` cron job (daily at minimum)
5. **Enable automatic security updates** — `unattended-upgrades` package
6. **Configure fail2ban** — Block brute-force SSH attempts
7. **Set up monitoring** — Free UptimeRobot account for uptime alerts

---

**Last Updated:** August 27, 2026
**Document Version:** 1.0.0
