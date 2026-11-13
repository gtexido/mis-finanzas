import UiIcon from './UiIcon';
import { plural } from '../utils/formatters';

// pendientes: cantidad de gastos del mes que todavía faltan en el mes siguiente.
export default function ReplicateAction({ nextMonth, onClick, pendientes }) {
  const mes = nextMonth.toLowerCase();
  const detalle = !pendientes
    ? `Todos los gastos de este mes ya están en ${mes}.`
    : `Faltan ${plural(pendientes, 'gasto')} en ${mes}. Elegí cuáles llevar.`;
  return <button type="button" className="replicate-link" onClick={onClick}>
    <span className="replicate-icon"><UiIcon name="calendar" size={21}/></span>
    <span><strong>Replicar gastos</strong><small>{detalle}</small></span>
    <UiIcon name="chevron" size={18}/>
  </button>;
}
