import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api/orders';

const products = [
  { id: 'aurora-lamp', name: 'Aurora Desk Lamp', category: 'Home / lighting', price: 84, icon: '◒', color: '#d9ead6', description: 'Warm, adjustable light for focused work.' },
  { id: 'field-notebook', name: 'Field Notes Set', category: 'Stationery / paper', price: 24, icon: '▤', color: '#f0e1bf', description: 'Three recycled notebooks for big ideas.' },
  { id: 'terra-mug', name: 'Terra Stone Mug', category: 'Kitchen / ceramic', price: 32, icon: '◡', color: '#ead7ce', description: 'Hand-finished stoneware with a soft glaze.' },
  { id: 'orbit-headphones', name: 'Orbit Headphones', category: 'Tech / audio', price: 149, icon: '◉', color: '#d6e4eb', description: 'Quiet focus with rich, balanced sound.' },
  { id: 'sprout-kit', name: 'Window Sprout Kit', category: 'Garden / grow', price: 41, icon: '❋', color: '#dce8c9', description: 'A small green ritual for your windowsill.' },
  { id: 'studio-tote', name: 'Studio Carry Tote', category: 'Carry / canvas', price: 58, icon: '⌁', color: '#e8ddec', description: 'Heavy canvas, roomy shape, daily ready.' },
];

const requestTypes = [
  { id: 'success', label: 'Successful order', detail: 'Normal processing', help: 'Creates a normal order that should finish with SUCCESS.' },
  { id: 'failure', label: 'Processing failure', detail: 'Retries and alerting', help: 'Sets fail to true so Lambda retries the order and sends it to the failure destination.' },
  { id: 'invalid', label: 'Invalid amount', detail: 'Validation failure', help: 'Uses a negative amount so processor-fn rejects the order after it is accepted.' },
  { id: 'duplicate', label: 'Duplicate order', detail: 'Idempotency test', help: 'Uses a fixed order ID. Send once, wait about 20 seconds until it succeeds, then send again to see DUPLICATE_SKIPPED.' },
  { id: 'missing', label: 'Missing orderId', detail: 'Rejected instantly (400)', help: 'Omits orderId so ingestion-fn rejects it with 400 before anything is queued.' },
];

const money = value => `₹${value.toFixed(2)}`;
const createOrderId = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function App() {
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [requestType, setRequestType] = useState('success');
  const [orderId, setOrderId] = useState(createOrderId());
  const [endpoint, setEndpoint] = useState(API_URL);
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);

  const type = requestTypes.find(item => item.id === requestType);
  const amount = selected ? selected.price * quantity : 0;
  const payload = selected
    ? requestType === 'missing'
      ? { amount }
      : {
          orderId: requestType === 'duplicate' ? `DUP-${selected.id}` : orderId,
          amount: requestType === 'invalid' ? -Math.abs(amount) : amount,
          fail: requestType === 'failure',
        }
    : null;

  function selectProduct(product) {
    setSelected(product);
    setQuantity(1);
    setOrderId(createOrderId());
    setNotice(null);
  }

  async function sendRequest() {
    if (!payload || !endpoint.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch(endpoint.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice({ kind: 'error', text: `${response.status}: ${data.error || data.message || 'Request rejected'}` });
      } else {
        setNotice({ kind: 'success', text: `${response.status} Accepted. Order ${data.orderId || payload.orderId || 'request'} is moving through the async workflow.` });
      }
      if (requestType !== 'duplicate') setOrderId(createOrderId());
    } catch (error) {
      setNotice({ kind: 'error', text: `Network or CORS error: ${error.message}. Check the endpoint URL and API Gateway CORS.` });
    } finally {
      setSending(false);
    }
  }

  async function copyPayload() {
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setNotice({ kind: 'success', text: 'JSON copied to your clipboard.' });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span><span>Northstar Market</span></div>
        <div className="top-meta"><span className="online-dot" /> AWS order console <span className="divider">/</span> ap-south-1</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">React order request builder</p>
          <h1>Turn a product<br /><em>into a request.</em></h1>
          <p className="hero-copy">Pick an item, choose the Lambda behavior you want to test, and send a clean order payload to your API Gateway.</p>
        </div>
        <div className="hero-note"><span className="note-label">Async response</span><strong>202 Accepted</strong><p>Processing continues through your Lambda Destinations workflow after submission.</p></div>
      </section>

      <main className="workspace">
        <section className="catalog">
          <div className="section-heading"><div><p className="eyebrow">01 / catalog</p><h2>Choose a product</h2></div><span>{products.length} available</span></div>
          <div className="product-grid">
            {products.map(product => (
              <button key={product.id} className={`product-card ${selected?.id === product.id ? 'selected' : ''}`} onClick={() => selectProduct(product)}>
                <div className="product-art" style={{ '--art': product.color }}>{product.icon}</div>
                <div className="product-info"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-bottom"><strong>{money(product.price)}</strong><span>Choose <b>→</b></span></div></div>
              </button>
            ))}
          </div>
        </section>

        <aside className="builder">
          <div className="builder-heading"><div><p className="eyebrow">02 / request</p><h2>Build your order</h2></div><span className="order-code">{selected ? orderId : 'NO ITEM'}</span></div>
          {!selected ? <div className="builder-empty"><span>＋</span><p>Select a product to<br />start your request.</p></div> : <>
            <div className="selected-product"><div className="mini-art" style={{ '--art': selected.color }}>{selected.icon}</div><div><h3>{selected.name}</h3><p>{selected.description}</p></div></div>
            <div className="quantity-row"><span>Quantity</span><div className="stepper"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Decrease quantity">−</button><span>{quantity}</span><button onClick={() => setQuantity(value => Math.min(20, value + 1))} aria-label="Increase quantity">+</button></div></div>
            <div className="total-row"><span>Request total</span><strong>{money(amount)}</strong></div>
            <div className="field-group"><label>Request type</label><div className="request-grid">{requestTypes.map(item => <button key={item.id} className={`request-option ${requestType === item.id ? 'active' : ''}`} onClick={() => setRequestType(item.id)}><strong>{item.label}</strong><span>{item.detail}</span></button>)}</div><p className="field-help">{type.help}</p></div>
            <div className="field-group"><label htmlFor="endpoint">API Gateway endpoint</label><input id="endpoint" value={endpoint} onChange={event => setEndpoint(event.target.value)} /></div>
            <div className="actions"><button className="primary-action" onClick={() => setPayloadOpen(true)}>Generate request <span>↗</span></button><button className="secondary-action" onClick={sendRequest} disabled={sending}>{sending ? 'Sending...' : 'Send to AWS'}</button></div>
            {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}
          </>}
        </aside>
      </main>

      {payloadOpen && <div className="modal-backdrop" onClick={event => event.target === event.currentTarget && setPayloadOpen(false)}><section className="payload-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">Generated payload</p><h2>Ready for API Gateway</h2></div><button className="close-button" onClick={() => setPayloadOpen(false)} aria-label="Close">×</button></div><pre>{JSON.stringify(payload, null, 2)}</pre><div className="modal-actions"><button className="secondary-action" onClick={copyPayload}>Copy JSON</button><button className="primary-action" onClick={() => { setPayloadOpen(false); sendRequest(); }}>Send to AWS <span>↗</span></button></div></section></div>}
    </div>
  );
}

export default App;
