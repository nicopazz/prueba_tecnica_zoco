type Signals = { required: string[]; possible: string[]; suggested: string[] };

export default function ReviewSignals({ required, possible, suggested }: Signals) {
  return <div className="admin-review-checks">
    {required.length ? <p className="admin-signal"><strong>Para publicar</strong><span>{required.join(" · ")}</span></p>
      : <p className="admin-review-complete">Datos básicos completos</p>}
    {possible.length > 0 && <p className="admin-signal admin-signal-warning"><strong>A comprobar</strong><span>{possible.join(" · ")}</span></p>}
    {suggested.length > 0 && <details className="admin-review-optional"><summary>Mejoras opcionales ({suggested.length})</summary>
      <ul>{suggested.map(item => <li key={item}>{item}</li>)}</ul></details>}
  </div>;
}
