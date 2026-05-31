import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useWriteContract, useSwitchChain } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { CONTRACTS, base, baseSepolia } from './wagmi.js'
import OnChainWillABI from './OnChainWillABI.json'

const TIMER_OPTIONS = [
  { label: '30 days', value: 30, desc: 'High urgency — best for critical assets' },
  { label: '60 days', value: 60, desc: 'Balanced — recommended for most users' },
  { label: '90 days', value: 90, desc: 'Relaxed — ideal for long-term holders' },
  { label: '180 days', value: 180, desc: 'Ultra patient — for rare check-ins' },
]

function shortenAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function isValidAddress(addr) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr)
}

export default function App() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  // Network selection — testnet or mainnet
  const [selectedChain, setSelectedChain] = useState(baseSepolia)
  const isTestnet = selectedChain.id === baseSepolia.id
  const contractAddress = CONTRACTS[selectedChain.id]
  const usdcAddress = USDC[selectedChain.id]

  const { data: ethBalance } = useBalance({ address, chainId: selectedChain.id })

  const [step, setStep] = useState(1)
  const [beneficiary, setBeneficiary] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [timerDays, setTimerDays] = useState(60)
  const [ethAmount, setEthAmount] = useState('')
  const [aiPlan, setAiPlan] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [approved, setApproved] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [txStep, setTxStep] = useState('')

  const wrongNetwork = isConnected && chain?.id !== selectedChain.id

  async function handleNetworkSwitch(newChain) {
    setSelectedChain(newChain)
    setStep(1)
    setApproved(false)
    setTxHash(null)
    if (isConnected) switchChain({ chainId: newChain.id })
  }

  async function generateAIPlan() {
    if (!isValidAddress(beneficiary)) return
    setLoadingPlan(true)
    setStep(3)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are an onchain inheritance advisor. A user wants to set up an OnChain Will on Base blockchain.

Their details:
- Their wallet: ${address}
- Beneficiary name: ${beneficiaryName || 'their loved one'}
- Beneficiary wallet: ${beneficiary}
- Inactivity trigger: ${timerDays} days of wallet inactivity
- Amount to transfer: ${ethAmount || 'all'} ETH (Base Sepolia)

Write a warm, clear, human-readable inheritance plan. Include:
1. A 2-sentence plain-English summary of what will happen
2. Exactly what the inactivity trigger means in practice
3. The specific action that will execute (ETH transfer on Base)
4. A reassurance about security and human approval required
5. A suggested message to leave for their beneficiary

Keep it under 250 words. Be warm and human, not technical. This is about protecting loved ones.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || 'Plan generated successfully.'
      setAiPlan(text)
    } catch (e) {
      setAiPlan(`Your OnChain Will has been prepared.\n\n**Summary:** If your wallet at ${shortenAddress(address)} shows no activity for ${timerDays} days, ${ethAmount || 'your'} ETH will be sent to ${beneficiaryName || 'your beneficiary'} at ${shortenAddress(beneficiary)} on Base.\n\n**Inactivity trigger:** The system monitors your last transaction. After ${timerDays} days of silence, the prepared transfer is queued for one final human approval.\n\n**ETH transfer prepared:** ${ethAmount || '?'} ETH → ${shortenAddress(beneficiary)} — ready for your approval.\n\n**Security:** Nothing moves without your explicit approval. You remain in control at all times.\n\n**Message for your loved one:** "If you're reading this, know that I planned ahead for you. This transfer is my way of making sure you're taken care of."`)
    }
    setLoadingPlan(false)
  }

  const calldata = beneficiary && isValidAddress(beneficiary) && ethAmount
    ? `Send ${ethAmount} ETH → ${shortenAddress(beneficiary)} after ${timerDays} days of inactivity`
    : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header address={address} isConnected={isConnected} onConnect={() => connect({ connector: connectors[0] })} onDisconnect={disconnect} wrongNetwork={wrongNetwork} selectedChain={selectedChain} onSwitchNetwork={handleNetworkSwitch} />

      <main style={{ flex: 1, maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>

        {!isConnected ? (
          <LandingHero onConnect={() => connect({ connector: connectors[0] })} connectors={connectors} connect={connect} />
        ) : wrongNetwork ? (
          <WrongNetwork />
        ) : approved ? (
          <SuccessView txHash={txHash} beneficiary={beneficiary} beneficiaryName={beneficiaryName} timerDays={timerDays} ethAmount={ethAmount} address={address} chain={chain} />
        ) : (
          <div>
            <StepIndicator current={step} />

            {step === 1 && (
              <Step1
                address={address}
                ethBalance={ethBalance}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <Step2
                beneficiary={beneficiary}
                setBeneficiary={setBeneficiary}
                beneficiaryName={beneficiaryName}
                setBeneficiaryName={setBeneficiaryName}
                timerDays={timerDays}
                setTimerDays={setTimerDays}
                ethAmount={ethAmount}
                setEthAmount={setEthAmount}
                onBack={() => setStep(1)}
                onNext={generateAIPlan}
              />
            )}

            {step === 3 && (
              <Step3
                loading={loadingPlan}
                aiPlan={aiPlan}
                beneficiary={beneficiary}
                beneficiaryName={beneficiaryName}
                timerDays={timerDays}
                ethAmount={ethAmount}
                calldata={calldata}
                address={address}
                txStep={txStep}
                onBack={() => setStep(2)}
                onApprove={async () => {
                  if (!contractAddress) {
                    alert('Mainnet contract not deployed yet. Please switch to Testnet.')
                    return
                  }
                  try {
                    // Single step: Register will + deposit ETH
                    setTxStep('registering')
                    const amount = parseEther(ethAmount || '0')
                    const hash = await writeContractAsync({
                      address: contractAddress,
                      abi: OnChainWillABI,
                      functionName: 'registerWill',
                      args: [beneficiary, BigInt(timerDays), beneficiaryName || ''],
                      value: amount,
                      chainId: selectedChain.id,
                    })

                    setTxHash(hash)
                    setTxStep('done')
                    setApproved(true)
                  } catch (e) {
                    console.error(e)
                    setTxStep('')
                    alert('Transaction failed: ' + (e.shortMessage || e.message))
                  }
                }}
              />
            )}
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid #1e1c18', color: '#4a4740', fontSize: 12, fontFamily: 'var(--mono)' }}>
        BUILT ON BASE · ONCHAIN WILL · AGENT QUEST 2026
      </footer>
    </div>
  )
}

function NetworkToggle({ selectedChain, onSwitchNetwork }) {
  const isTestnet = selectedChain.id === baseSepolia.id
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#111', border: '1px solid #2a2820', borderRadius: 'var(--radius)', padding: 3, gap: 2 }}>
      <button
        onClick={() => onSwitchNetwork(baseSepolia)}
        style={{
          padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 11, fontFamily: 'var(--mono)',
          border: 'none', cursor: 'pointer', fontWeight: isTestnet ? 600 : 400,
          background: isTestnet ? '#2a2820' : 'transparent',
          color: isTestnet ? 'var(--gold)' : 'var(--muted)',
          transition: 'all .15s',
        }}
      >TESTNET</button>
      <button
        onClick={() => onSwitchNetwork(base)}
        style={{
          padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: 11, fontFamily: 'var(--mono)',
          border: 'none', cursor: 'pointer', fontWeight: !isTestnet ? 600 : 400,
          background: !isTestnet ? '#2a2820' : 'transparent',
          color: !isTestnet ? 'var(--gold)' : 'var(--muted)',
          transition: 'all .15s',
        }}
      >MAINNET</button>
    </div>
  )
}

function Header({ address, isConnected, onConnect, onDisconnect, wrongNetwork, selectedChain, onSwitchNetwork }) {
  return (
    <header style={{ borderBottom: '1px solid #1e1c18', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.png" alt="OnChain Will" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: '0.02em' }}>OnChain Will</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <NetworkToggle selectedChain={selectedChain} onSwitchNetwork={onSwitchNetwork} />
        {isConnected ? (
          <>
            {wrongNetwork && <span style={{ fontSize: 11, color: '#e74c3c', fontFamily: 'var(--mono)' }}>WRONG NETWORK</span>}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', background: '#111', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid #222' }}>
              {shortenAddress(address)}
            </div>
            <button onClick={onDisconnect} style={{ background: 'none', border: '1px solid #333', color: 'var(--muted)', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12 }}>
              Disconnect
            </button>
          </>
        ) : (
          <button onClick={onConnect} style={btnGold}>Connect Wallet</button>
        )}
      </div>
    </header>
  )
}

function LandingHero({ connectors, connect }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      <div className="fade-up" style={{ marginBottom: 24 }}>
        <img src="/logo.png" alt="OnChain Will" style={{ width: 100, height: 100, borderRadius: 20, objectFit: 'cover' }} />
      </div>
      <h1 className="fade-up-2" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, marginBottom: 16, fontWeight: 400 }}>
        Your crypto.<br />
        <em style={{ color: 'var(--gold)' }}>Their future.</em>
      </h1>
      <p className="fade-up-3" style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
        Set up an on-chain inheritance plan in 3 minutes. If you go inactive, your USDC finds its way home — to the people who matter most.
      </p>

      <div className="fade-up-4" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {connectors.slice(0, 2).map(c => {
          const isCoinbase = c.name === 'Coinbase Wallet'
          return (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button onClick={() => connect({ connector: c })} style={btnGold}>
                {isCoinbase ? '🔵 Connect with Coinbase' : '🦊 Connect MetaMask / Browser Wallet'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 200, textAlign: 'center', lineHeight: 1.4 }}>
                {isCoinbase
                  ? 'Use Coinbase Wallet app or Smart Wallet — best for new users'
                  : 'Use MetaMask or any browser extension wallet you already have'}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ background: '#110a0a', border: '1px solid #3a1a1a', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', maxWidth: 480, margin: '0 auto 2rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <div style={{ fontSize: 12, color: '#c9a0a0', lineHeight: 1.6 }}>
          <strong>Stay safe:</strong> Always verify you're on the correct URL before connecting your wallet. This app never asks for your seed phrase or private key. If anything asks for those — it's a scam.
        </div>
      </div>

      <div className="fade-up-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 560, margin: '0 auto' }}>
        {[
          { icon: '🔐', label: 'Non-custodial', desc: 'You keep your keys' },
          { icon: '⚡', label: 'Base network', desc: 'Sub-cent gas fees' },
          { icon: '✋', label: 'Human approval', desc: 'Nothing moves without you' },
        ].map(f => (
          <div key={f.label} style={{ background: '#111', border: '1px solid #1e1c18', borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WrongNetwork() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginBottom: 12 }}>Switch to Base</h2>
      <p style={{ color: 'var(--muted)' }}>Please switch your wallet network to Base mainnet to continue.</p>
    </div>
  )
}

function StepIndicator({ current }) {
  const steps = ['Connect', 'Configure', 'Review & Approve']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: 0 }}>
      {steps.map((s, i) => {
        const n = i + 1
        const done = current > n
        const active = current === n
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? 'var(--gold)' : active ? 'var(--ink)' : 'transparent',
                border: done ? 'none' : active ? '2px solid var(--gold)' : '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontFamily: 'var(--mono)',
                color: done ? 'var(--ink)' : active ? 'var(--gold)' : 'var(--muted)',
                fontWeight: done || active ? 600 : 400
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize: 13, color: active ? 'var(--paper)' : done ? 'var(--gold)' : 'var(--muted)', fontWeight: active ? 500 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: current > n + 1 ? 'var(--gold-dim)' : '#222', margin: '0 12px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Step1({ address, ethBalance, onNext }) {
  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 8, fontWeight: 400 }}>Wallet connected</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>Your Base wallet is ready. We can see your address and balance — nothing else.</p>

      <div style={{ background: '#0f0e0c', border: '1px solid #2a2820', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your wallet</span>
          <span style={{ fontSize: 11, background: '#1a2e1a', color: '#4ade80', padding: '3px 8px', borderRadius: 'var(--radius)', fontFamily: 'var(--mono)' }}>BASE MAINNET</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--gold-light)', wordBreak: 'break-all', marginBottom: 16 }}>{address}</div>
        {ethBalance && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>ETH balance:</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{parseFloat(formatEther(ethBalance.value)).toFixed(4)} ETH</span>
          </div>
        )}
      </div>

      <div style={{ background: '#0d1117', border: '1px solid #1e2d1e', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Your keys stay yours</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>OnChain Will never stores your private keys. We only read your address and prepare transaction calldata. You approve every action.</div>
        </div>
      </div>

      <button onClick={onNext} style={{ ...btnGold, width: '100%', padding: '14px', fontSize: 15 }}>
        Set Up My Will →
      </button>
    </div>
  )
}

function Step2({ beneficiary, setBeneficiary, beneficiaryName, setBeneficiaryName, timerDays, setTimerDays, ethAmount, setEthAmount, onBack, onNext }) {
  const validAddress = beneficiary === '' || isValidAddress(beneficiary)
  const canProceed = isValidAddress(beneficiary) && timerDays && ethAmount && parseFloat(ethAmount) > 0

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 8, fontWeight: 400 }}>Configure your will</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>Who should receive your crypto, and when should it trigger?</p>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Beneficiary name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
        <input
          style={fieldInput}
          placeholder="e.g. My wife Sarah"
          value={beneficiaryName}
          onChange={e => setBeneficiaryName(e.target.value)}
        />
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Beneficiary wallet address <span style={{ color: '#e74c3c' }}>*</span></label>
        <input
          style={{ ...fieldInput, borderColor: !validAddress ? '#e74c3c' : beneficiary && isValidAddress(beneficiary) ? '#2d6a4f' : '#2a2820' }}
          placeholder="0x..."
          value={beneficiary}
          onChange={e => setBeneficiary(e.target.value)}
        />
        {!validAddress && <span style={{ fontSize: 11, color: '#e74c3c', marginTop: 4, display: 'block' }}>Please enter a valid Ethereum address</span>}
        {beneficiary && isValidAddress(beneficiary) && <span style={{ fontSize: 11, color: '#4ade80', marginTop: 4, display: 'block' }}>✓ Valid address</span>}
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>ETH amount to deposit <span style={{ color: '#e74c3c' }}>*</span></label>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...fieldInput, paddingLeft: 52 }}
            placeholder="0.001"
            type="number"
            min="0"
            step="0.001"
            value={ethAmount}
            onChange={e => setEthAmount(e.target.value)}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>ETH</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>This ETH will be locked in the contract and sent to your beneficiary if triggered</span>
      </div>

      <div style={fieldGroup}>
        <label style={fieldLabel}>Inactivity trigger</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {TIMER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimerDays(opt.value)}
              style={{
                background: timerDays === opt.value ? '#1a160a' : '#0f0e0c',
                border: timerDays === opt.value ? '1.5px solid var(--gold)' : '1px solid #2a2820',
                borderRadius: 'var(--radius)',
                padding: '0.875rem 1rem',
                textAlign: 'left',
                color: 'var(--paper)',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontWeight: 500, fontSize: 14, color: timerDays === opt.value ? 'var(--gold)' : 'var(--paper)', marginBottom: 3 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem' }}>
        <button onClick={onBack} style={{ ...btnGhost, flex: 1 }}>← Back</button>
        <button onClick={onNext} disabled={!canProceed} style={{ ...btnGold, flex: 2, opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed' }}>
          Generate My Plan →
        </button>
      </div>
    </div>
  )
}

function Step3({ loading, aiPlan, beneficiary, beneficiaryName, timerDays, ethAmount, calldata, address, onBack, onApprove, txStep }) {
  return (
    <div className="fade-up">
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 8, fontWeight: 400 }}>Your inheritance plan</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>Review everything carefully. Nothing executes until you approve.</p>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ marginBottom: 16, animation: 'pulse 1.5s infinite' }}>
            <img src="/logo.png" alt="OnChain Will" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
          </div>
          <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>AI is drafting your inheritance plan...</p>
        </div>
      ) : aiPlan && (
        <>
          <div style={{ background: '#0a0f0a', border: '1px solid #1e2d1e', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Inheritance Advisor</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.8, color: '#d4d0c8', whiteSpace: 'pre-wrap' }}>{aiPlan}</div>
          </div>

          <div style={{ background: '#0f0e0c', border: '1px solid #2a2820', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Prepared calldata</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { label: 'Contract', value: 'OnChainWill on Base Sepolia', mono: true },
                { label: 'Function', value: 'registerWill(address, uint256, string)', mono: true },
                { label: 'To', value: shortenAddress(beneficiary) + (beneficiaryName ? ` — ${beneficiaryName}` : ''), mono: false },
                { label: 'Amount', value: ethAmount ? `${ethAmount} ETH` : '—', mono: false },
                { label: 'Trigger', value: `${timerDays} days of inactivity`, mono: false },
                { label: 'Gas estimate', value: '< $0.01 on Base', mono: false },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #1a1814' }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontFamily: row.mono ? 'var(--mono)' : 'var(--sans)', color: row.mono ? 'var(--gold-light)' : 'var(--paper)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            {calldata && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Raw calldata:</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#4a4740', wordBreak: 'break-all', lineHeight: 1.6 }}>{calldata}</div>
              </div>
            )}
          </div>

          <div style={{ background: '#110a0a', border: '1px solid #3a1a1a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: 12 }}>
            <span>⚠️</span>
            <div style={{ fontSize: 12, color: '#c9a0a0', lineHeight: 1.6 }}>
              <strong>This is a demo for the Base MCP Agent Quest contest.</strong> In production, the inactivity oracle would be powered by a Base MCP plugin monitoring your wallet's last transaction timestamp on-chain.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onBack} disabled={!!txStep} style={{ ...btnGhost, flex: 1, opacity: txStep ? 0.4 : 1 }}>← Edit</button>
            <button onClick={onApprove} disabled={!!txStep} style={{ ...btnGold, flex: 2, background: 'var(--gold)', color: 'var(--ink)', fontWeight: 600, opacity: txStep ? 0.7 : 1 }}>
              {txStep === 'registering' ? '⏳ Registering Will on Base...' : '✓ Deposit ETH & Register Will'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SuccessView({ txHash, beneficiary, beneficiaryName, timerDays, ethAmount, address, chain }) {
  return (
    <div className="fade-up" style={{ textAlign: 'center', padding: '3rem 0' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 36, marginBottom: 12, fontWeight: 400 }}>Will registered on Base</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7 }}>
        Your inheritance plan is active. If your wallet shows no activity for <strong style={{ color: 'var(--gold)' }}>{timerDays} days</strong>, {ethAmount ? `${ethAmount} ETH` : 'your ETH'} will be queued for transfer to {beneficiaryName || shortenAddress(beneficiary)}.
      </p>

      <div style={{ background: '#0a0f0a', border: '1px solid #1e2d1e', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 480, margin: '0 auto 2rem', textAlign: 'left' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transaction confirmed</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--gold-light)', wordBreak: 'break-all', marginBottom: 12 }}>{txHash}</div>
        <a
          href={txHash ? `https://${chain?.id === baseSepolia.id ? 'sepolia.' : ''}basescan.org/tx/${txHash}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}
        >
          View on Basescan →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 480, margin: '0 auto 2rem' }}>
        {[
          { label: 'Beneficiary', value: beneficiaryName || shortenAddress(beneficiary) },
          { label: 'Trigger', value: `${timerDays} days` },
          { label: 'Amount', value: ethAmount ? `${ethAmount} ETH` : '—' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid #1e1c18', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
        "Built on Base · OnChain Will · Agent Quest 2026"
      </p>
    </div>
  )
}

const btnGold = {
  background: 'var(--gold)',
  color: 'var(--ink)',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 'var(--radius)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  transition: 'opacity .15s',
}

const btnGhost = {
  background: 'transparent',
  color: 'var(--muted)',
  border: '1px solid #333',
  padding: '10px 20px',
  borderRadius: 'var(--radius)',
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
}

const fieldGroup = { marginBottom: '1.5rem' }

const fieldLabel = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 8,
  color: 'var(--paper)',
  letterSpacing: '0.02em',
}

const fieldInput = {
  width: '100%',
  background: '#0f0e0c',
  border: '1px solid #2a2820',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
  color: 'var(--paper)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color .15s',
}
