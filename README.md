# ⚖️ OnChain Will — Crypto Inheritance Planner
### Base MCP Agent Quest 2026 Submission

**"If I disappear, my crypto finds its way home."**

Set up an on-chain inheritance plan in 3 minutes. Connect your Base wallet, name your beneficiary, set an inactivity timer — and the AI plans the whole thing in plain English before you approve.

---

## What it does

1. **Connect** your Base wallet (Coinbase Smart Wallet or MetaMask)
2. **Configure** beneficiary address, USDC amount, and inactivity trigger (30/60/90/180 days)
3. **AI plans it** — Claude reads your wallet and writes a human-readable inheritance plan
4. **Review & approve** — full USDC transfer calldata shown before you sign anything

Nothing executes without your explicit approval. Your keys stay yours.

---

## Deploy in 5 minutes (free)

### 1. Clone and install
```bash
git clone <your-repo>
cd onchain-will
npm install
```

### 2. Add your Anthropic API key
Create `.env.local`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Update `src/App.jsx` line with the fetch call — add the header:
```js
'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
'anthropic-version': '2023-06-01',
'anthropic-dangerous-direct-browser-access': 'true',
```

### 3. Deploy to Vercel (free)
```bash
npm install -g vercel
vercel
```
Add your env var in the Vercel dashboard under Settings → Environment Variables.

### 4. Done — share the URL in the contest reply

---

## Tech stack
- **React + Vite** — frontend
- **wagmi v2 + viem** — wallet connect on Base
- **Coinbase Smart Wallet** — Base-native wallet
- **Claude API (Sonnet 4)** — AI inheritance planning
- **Base mainnet** — where the magic happens

---

## Demo video script (under 3 mins)

1. Open the app, explain the concept (30 sec)
2. Connect Coinbase Wallet (20 sec)
3. Fill in beneficiary + timer + amount (30 sec)
4. Show AI generating the plan (40 sec)
5. Show the calldata + approve button (20 sec)
6. Success screen + Basescan link (20 sec)

**Total: ~2:40**

---

Built for **Base MCP Agent Quest 2026** · #BuildOnBase
