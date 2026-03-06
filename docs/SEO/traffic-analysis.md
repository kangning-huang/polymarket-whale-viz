# Polybot Arena Traffic Analysis

**Report Date:** 2026-03-06
**GA Period:** Feb 6 - Mar 5, 2026 (28 days)
**GSC Period:** Feb 24 - Mar 3, 2026 (~7 days, "last 3 months" filter but data only present for this range)

---

## 1. Traffic Sources (GA)

| Channel | Sessions | New Users | % of New Users |
|---------|----------|-----------|----------------|
| Direct | 468 | 298 | 66.5% |
| Organic Social | 155 | 86 | 19.2% |
| Unassigned | 153 | 1 | 0.2% |
| Organic Search | 94 | 51 | 11.4% |
| Referral | 25 | 12 | 2.7% |
| **Total** | **895** | **448** | **100%** |

### Interpretation

- **Direct traffic dominates (52% of sessions, 67% of new users).** This is typical for a niche tool shared via word-of-mouth, Discord links, or direct URL sharing in crypto/Polymarket communities. Many "Direct" visits are likely from Telegram, Discord, or other platforms that strip referrer headers.
- **Organic Social is the #2 acquisition channel (17% of sessions).** Likely Twitter/X or Reddit posts about Polymarket bots driving traffic.
- **Organic Search is small but growing (10% of sessions, 51 new users).** GSC confirms only 42 clicks in the last 7 days (~6/day), consistent with GA's 94 search sessions over 28 days (~3.4/day average, but accelerating recently).
- **"Unassigned" has 153 sessions but only 1 new user** — these are likely returning users from sources GA can't classify (browser privacy features, app webviews, etc.).
- **Referral is minimal (25 sessions)** — no strong backlink sources yet.

## 2. Traffic Timeline

The site launched (or was first indexed) around **Feb 24** (day 18 of the GA period). Before that, zero activity.

| Date (approx) | GA Active Users | GA New Users | GSC Clicks | GSC Impressions |
|---------------|----------------|-------------|------------|-----------------|
| Feb 24 (day 18) | 6 | 6 | 0 | 0 |
| Feb 25 (day 19) | 51 | 48 | 2 | 85 |
| Feb 26 (day 20) | 60 | 58 | 10 | 202 |
| Feb 27 (day 21) | 50 | 45 | 0 | 141 |
| Feb 28 (day 22) | 53 | 49 | 2 | 126 |
| Mar 1 (day 23) | 34 | 25 | 8 | 156 |
| Mar 2 (day 24) | 95 | 88 | 12 | 449 |
| Mar 3 (day 25) | 57 | 49 | 8 | 339 |
| Mar 4 (day 26) | 59 | 48 | — | — |
| Mar 5 (day 27) | 55 | 32 | — | — |

### Key observations:
- **Feb 24 was launch day** — 6 users, all new. Likely the first social media share.
- **Feb 25-26 saw a spike** (51-60 users) — initial virality, probably a tweet or Reddit post. GSC shows 10 clicks on Feb 26, the peak search day.
- **Mar 2 had a large spike (95 active, 88 new)** — another social share or community post. GSC impressions also spiked to 449.
- **Traffic is volatile but plateauing around 50-60 daily active users** outside of spike days.
- **New user ratio remains very high (~85-90%)** — almost no returning users yet. The site hasn't built a habitual audience.

## 3. Search Performance Deep Dive (GSC)

### 3.1 Query Profile

Almost all search queries are **branded/navigational** (people searching for specific bot names):

| Query Type | Example | Impressions | Clicks |
|-----------|---------|-------------|--------|
| Bot name + polymarket | "vidarx polymarket", "vague-sourdough polymarket" | ~100 | 2 |
| Bot name only | "vidarx", "0x8dxd", "distinct baguette" | ~20 | 2 |
| Generic/discovery | "polymarket trading bot", "trading bots" | ~7 | 1 |
| Brand | "polybot", "bot arena" | ~16 | 1 |

**The site gets virtually zero discovery traffic from generic queries.** "Polymarket trading bot" ranks at position 92, "trading bots" at 97. These high-value keywords are completely out of reach currently.

### 3.2 Page Performance

| Page | Impressions | Clicks | CTR | Note |
|------|-------------|--------|-----|------|
| Homepage | 1,020 | 36 | 3.5% | Main entry point |
| /leaderboard/ | 516 | 0 | 0% | HIGH IMPRESSIONS, ZERO CLICKS |
| /bot/vague-sourdough/ | 176 | 3 | 1.7% | Moderate |
| /bot/vidarx/ | 108 | 3 | 2.8% | Best CTR of bot pages |
| /leaderboard (no slash) | 51 | 0 | 0% | Duplicate of above |

**The leaderboard page is the biggest missed opportunity** — 567 combined impressions (with/without trailing slash) and zero clicks. The search snippet is not compelling enough.

### 3.3 Device Split

| Device | Impressions | Clicks | CTR |
|--------|-------------|--------|-----|
| Desktop | 278 | 30 | 10.8% |
| Mobile | 1,220 | 12 | 1.0% |

**Mobile gets 81% of impressions but only 29% of clicks.** This 11x CTR gap suggests:
1. Mobile search snippets may render poorly (no og:image, long titles getting truncated)
2. The SPA nature may affect how Google generates mobile snippets
3. Mobile users may be less likely to click through to a data-heavy dashboard

## 4. User Engagement (GA)

| Metric | Value |
|--------|-------|
| Total page views | 3,996 |
| Sessions | 744 (first visits) + others |
| Pages per session | ~5.4 (3996 / 744) |
| Scroll events | 691 (93% of sessions) |
| Click events | 216 (29% of sessions) |
| Avg engagement time | Ranges 80-213 sec/day (~1.5-3.5 min) |

### Page View Distribution

| Page | Views | % of Total |
|------|-------|-----------|
| Homepage | 1,315 | 32.9% |
| distinct-baguette | 940 | 23.5% |
| vidarx | 350 | 8.8% |
| abrak25 | 263 | 6.6% |
| Qualitative | 246 | 6.2% |
| Leaderboard | 243 | 6.1% |
| 0x8dxd | 241 | 6.0% |
| Blog post | 148 | 3.7% |
| vague-sourdough | 123 | 3.1% |
| 404/redirect page | 119 | 3.0% |

**distinct-baguette is by far the most viewed bot** (940 views, nearly 3x the next bot). The blog post gets modest engagement (148 views). The "Polybot Arena" entry with 119 views likely represents 404 redirects or the SPA shell loading before React hydrates.

### User Retention

The cohort data shows only one active cohort (week of Feb 22, 206 users). Week 1+ retention data is not yet available (-1 = pending). **Too early to assess retention.**

## 5. Geographic Distribution

### GA Top Countries (Active Users)

| Country | Active Users |
|---------|-------------|
| US | 158 (35%) |
| Japan | 26 (5.8%) |
| India | 20 (4.5%) |
| Netherlands | 19 (4.2%) |
| Canada | 18 (4.0%) |
| Spain | 16 (3.6%) |
| France | 15 (3.3%) |

### GSC vs GA Comparison

| Country | GA Users | GSC Clicks | GSC Impressions |
|---------|----------|------------|-----------------|
| US | 158 | 12 | 466 |
| Japan | 26 | 1 | 13 |
| India | 20 | 1 | 42 |
| Brazil | 9 | 0 | 129 |
| UK | 9 | 0 | 80 |

**The gap between GA users and GSC clicks confirms most traffic is NOT from search.** The US has 158 GA users but only 12 search clicks — 92% of US traffic comes from non-search sources. Japan has 26 GA users but only 1 search click. This pattern holds globally.

## 6. Summary and Key Takeaways

### What's working:
1. **Strong word-of-mouth / social acquisition** — Direct + Social account for 70%+ of traffic
2. **Good engagement** — 5.4 pages/session and 1.5-3.5 min avg engagement is strong for a dashboard
3. **distinct-baguette drives disproportionate interest** — clear star content
4. **Site is getting indexed** — Google is showing it for bot-name queries at decent positions (3-7)

### What's not working:
1. **Organic search is negligible** — only 10% of traffic, almost entirely branded queries
2. **Zero generic keyword rankings** — invisible for "polymarket trading bot", "polymarket bots", etc.
3. **Leaderboard page: 567 impressions, 0 clicks** — worst-performing page by CTR
4. **Mobile CTR is 11x worse than desktop** — major mobile snippet/UX issue
5. **No returning users yet** — ~85-90% of daily users are new
6. **No og:image** — hurts social sharing CTR and search appearance

### Traffic model:
The site's current growth model is **social virality spikes** — someone shares it on Twitter/Discord/Reddit, traffic spikes for a day, then settles back to a ~50 user/day baseline. Search is not yet a meaningful channel. To grow sustainably, the site needs to (a) rank for generic polymarket bot queries, and (b) give users a reason to return regularly.

### Technical issues impacting SEO:
1. Trailing slash duplication splitting authority between /leaderboard and /leaderboard/
2. No og:image for social/search visual presence
3. SPA rendering may limit how well Google indexes dynamic content
4. HTTP/HTTPS split (minor, 31 impressions on http)
