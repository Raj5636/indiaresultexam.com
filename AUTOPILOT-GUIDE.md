# India Result Exam - Autopilot Usage Guide

## 🚀 Quick Start

### Basic Import (All Posts)
```bash
node autopilot.js
```

### Import Limited Posts
```bash
# 10 posts from each category
node autopilot.js --limit=10

# 5 posts from each category
node autopilot.js --limit=5
```

### Import Specific Categories Only
```bash
# Only Latest Jobs
node autopilot.js --jobs

# Only Admit Cards
node autopilot.js --admit

# Only Results
node autopilot.js --results

# Multiple categories
node autopilot.js --categories=jobs,admit
```

### Combine Limit and Category
```bash
# Only 5 Latest Jobs
node autopilot.js --jobs --limit=5

# 10 Admit Cards and 10 Results
node autopilot.js --admit --results --limit=10
```

### Continuous Loop Mode
```bash
# Loop every 1 hour (default)
node autopilot.js --loop --limit=20

# Loop every 2 hours
node autopilot.js --loop --interval=2 --limit=10
```

## 📋 All Options

| Option | Description |
|--------|-------------|
| `--limit=N` | Import max N posts per category |
| `--jobs` | Import only Latest Jobs |
| `--admit` | Import only Admit Cards |
| `--results` | Import only Results |
| `--categories=X,Y,Z` | Import specific categories (comma-separated) |
| `--loop` | Run in continuous loop mode |
| `--interval=H` | Loop interval in hours (default: 1) |
| `--help` | Show this help message |

## ✅ Key Features

1. **Approved Posts Protection**: Jo posts aapne approve kar di hain, wo kabhi overwrite nahi honge
2. **Category Filtering**: Sirf specific categories ke posts import kar sakte hain
3. **Limit Control**: Kitni posts import karni hai, wo control kar sakte hain
4. **Continuous Mode**: Autopilot ko background mein continuously run kar sakte hain

## 💡 Recommended Workflow

### Step 1: Start Small
```bash
# Pehle sirf 10 posts import karo taaki check kar sako
node autopilot.js --limit=10
```

### Step 2: Review and Approve
Admin panel jao, posts review karo, edit karo, aur approve karo.

### Step 3: Import More
```bash
# Aur 10 posts import karo
node autopilot.js --limit=10
```

### Step 4: Full Import (When Ready)
```bash
# Jab aap comfortable ho, sabhi posts import karo
node autopilot.js
```

## 🔄 Continuous Operation

Agar aap chahte hain ki autopilot automatically har ghante new posts check kare:

```bash
node autopilot.js --loop --limit=5 --interval=1
```

Isse har ghante 5-5 new posts import honge, aur approved posts safe rahenge!

## 🛡️ Safety First

- **Approved Posts**: Kisi bhi approved post ko autopilot kabhi edit nahi karega
- **Selective Import**: Aap hi decide karo kya import karna hai
- **Limit Control**: Kabhi bhi limited posts import kar sakte hain
