import { ATTENTION_FILTERS } from '../utils/overview';
import { fmtARS } from '../utils/formatters';
import UiIcon from './UiIcon';

export default function AttentionSummary({ overview, onSelect }) {
  return <div className="attention-grid" aria-label="Avisos de todos los meses">
    {ATTENTION_FILTERS.map(({ id, label, icon, empty }) => {
      const { count, amount } = overview.summaries[id];
      return <button key={id} className={`attention-tile ${id} ${count ? 'has-items' : ''}`}
        onClick={() => onSelect(id)} aria-label={`${label}: ${count}. ${count ? fmtARS(amount) : empty}`}>
        <span className="attention-tile-label"><UiIcon name={icon} size={16}/>{label}</span>
        <span className="attention-tile-value"><strong>{count}</strong><UiIcon name="chevron" size={15}/></span>
        <span className={count ? 'money' : 'tile-empty'}>{count ? fmtARS(amount) : empty}</span>
      </button>;
    })}
  </div>;
}
