import { useState } from 'react'

export default function VertragsErsteller() {
  const [test, setTest] = useState('Hallo')
  return (
    <div className="card">
      <div className="section-title">Vertragsersteller</div>
      <p>{test}</p>
      <button onClick={() => setTest('Funktioniert!')}>Test</button>
    </div>
  )
}
