# Seven Journal

## Overview
**Seven Journal** is a premium, fully-functional completely client-side Trading Journal SPA designed to help traders log, review, and analyze trades with gamified, premium fintech styling.

This project was built mimicking the specifications extracted for modern tracking flows and follows all exact 4 phases listed for completion natively inside React. 

## Features Integrated (Phases 1-4)
- **Local Storage Architecture:** Complete Data/State persistence managed elegantly by `Zustand` and `Zod`.
- **Trading Journal Dashboard:** Gamified tracking utilizing area charts (`Recharts`) and KPI indicators reflecting dynamic entries.
- **Form System Setup:** Add, edit, and organize trade executions using complex input forms (hooked with `react-hook-form`).
- **Trades Grid:** Complete `@tanstack/react-table` driven tables with built in sorting.
- **Advanced Dynamic Views:**
    - High-level **Calendar** integration evaluating net PnL daily logic overlays.
    - Deep **Analytics** charts mapping out correlations (Bar charts, Pie splits per Setup, Pair, etc).
    - End-of-Day native tracking via the **Debrief** portal with star ratings and emotion trackers.
- **Export Powerhouse (Settings)**: Natively exports your state into RAW `.csv` sheets, strict `.json` backup blobs, or `.pdf` generated Formal Action reports!

## Setup Instructions
The project operates cleanly out of the box requiring nothing more than NPM:

1. Clone or unzip this project.
2. In your terminal, run `npm install` inside the root layer to install all dependencies (`react`, `framer`, `zustand`, `lucide`, etc).
3. Then simply boot up the hot-reload Vite environment:
```bash
npm run dev
```
4. Access the web application on `http://localhost:5173`. 
*(Note: Because no backend or Express layers are appended, there are zero DB environments to mock! Every user account interaction stays localized!)*
