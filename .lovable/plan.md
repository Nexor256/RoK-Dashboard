
# Kingdom Governors Ranking Dashboard

A Rise of Kingdoms dashboard for tracking and ranking governors within your kingdom, inspired by ROK Stats but focused on individual governor performance.

## Page 1: Dashboard Overview
- **Kingdom header** with kingdom number, name, and last updated timestamp
- **Summary cards** showing total governors tracked, average power, total kill points, and total deaths across the kingdom
- **Quick stats bar** with key kingdom-wide metrics at a glance

## Page 2: Governors Ranking Table
- **Sortable & filterable table** with columns: Governor Name, Alliance, Power, T4 Kills, T5 Kills, Deaths, Dead Troops, Healed, DKP (custom score), and Power Growth
- **Custom DKP score** calculated automatically (e.g. T4×4 + T5×10 + Dead×15)
- **Search bar** to find governors by name
- **Alliance filter** dropdown to filter by alliance tag
- **Rows per page control** and pagination
- Dark theme styling similar to the ROK Stats reference

## Page 3: Charts & Analytics
- **Power distribution chart** — bar chart of top governors by power
- **Kill points breakdown** — stacked bar chart (T4 vs T5 kills)
- **DKP leaderboard chart** — horizontal bar chart ranking governors by custom score
- **Growth over time** — line chart showing power changes across historical snapshots

## Page 4: Historical Snapshots
- **Snapshot selector** — dropdown to pick a date/snapshot to compare
- **Side-by-side comparison** showing stat changes between two snapshots (e.g. power gained, kills gained)
- **Delta indicators** (green/red arrows) showing improvement or decline per governor

## Data & Design
- **Static demo data** with ~20 sample governors across 3-4 alliances to showcase all features
- **Dark theme** matching the ROK Stats aesthetic (dark background, colored accents, clean tables)
- **Admin-only** — no auth for now since it's static demo data, but structured so login can be added later
- **Responsive layout** — works on desktop and tablet
