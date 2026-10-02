import UiIcon from './UiIcon';

export default function ReplicateAction({ nextMonth, onClick }) {
  return <button type="button" className="replicate-link" onClick={onClick}>
    <span className="replicate-icon"><UiIcon name="calendar" size={21}/></span>
    <span><strong>Replicar gastos</strong><small>Elegí qué gastos llevar a {nextMonth.toLowerCase()}.</small></span>
    <UiIcon name="chevron" size={18}/>
  </button>;
}
