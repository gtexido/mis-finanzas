import { fmtARS, normalizarFuenteIngreso } from '../utils/formatters';
import UiIcon from '../components/UiIcon';
import MonthComparison from '../components/MonthComparison';

export default function IncomeView({total, previous, hasPrevious, hasCurrent, previousLabel, partial, salary, salaryInput, setSalaryInput, saveSalary, salaryBusy, form, setForm, saveIncome, incomeBusy, sources, items, maxDay, onEdit, onDelete}) {
  return <div className="income-view">
    <section className="report-total"><span className="eyebrow muted">Ingresos del mes</span><div className="money income-total">{fmtARS(total)}</div><p className="muted">Sueldo y otros ingresos registrados</p></section>
    <MonthComparison income current={total} previous={previous} hasPrevious={hasPrevious} hasCurrent={hasCurrent} previousLabel={previousLabel} partial={partial}/>
    <section className="surface income-card">
      <div className="section-line"><h2>Sueldo del mes</h2><UiIcon name="wallet" size={21}/></div>
      {salary > 0 && <div className="income-salary"><strong className="money">{fmtARS(salary)}</strong><div className="row-actions"><button className="text-button" onClick={() => {setSalaryInput(String(salary)); document.getElementById('salary-amount')?.focus();}}><UiIcon name="edit" size={16}/>Editar</button><button className="text-button delete-link" onClick={() => onDelete({tipo:'sueldo', servicio:'Sueldo', monto:salary})}><UiIcon name="trash" size={16}/>Eliminar</button></div></div>}
      <form onSubmit={e => {e.preventDefault(); saveSalary();}}><label className="field-label" htmlFor="salary-amount">{salary > 0 ? 'Nuevo importe del sueldo' : 'Importe del sueldo'}</label><div className="salary-controls"><input id="salary-amount" className="inf" type="number" inputMode="decimal" step="any" min="0.01" placeholder="0" required value={salaryInput} disabled={salaryBusy} onChange={e => setSalaryInput(e.target.value)}/><button className="primary" disabled={salaryBusy}>{salaryBusy ? 'Guardando…' : salary > 0 ? 'Actualizar' : 'Guardar'}</button></div></form>
    </section>
    <section className="surface income-card" id="income-form">
      <div className="section-line"><h2>{form.id ? 'Editar ingreso' : 'Agregar otro ingreso'}</h2><UiIcon name="down" size={20}/></div>
      <form onSubmit={e => {e.preventDefault(); saveIncome();}}>
        <div className="field"><label htmlFor="income-source">Fuente del ingreso</label><input id="income-source" className="inf" list="income-sources" placeholder="Ej: Ventas, trabajo, reintegro" required maxLength={120} value={form.fuente} disabled={incomeBusy} onChange={e => setForm(p => ({...p,fuente:e.target.value}))}/><datalist id="income-sources">{sources.map(s => <option key={s} value={s}/>)}</datalist></div>
        <div className="income-fields"><div className="field"><label htmlFor="income-amount">Importe en pesos</label><input id="income-amount" className="inf" type="number" inputMode="decimal" min="0.01" step="any" required value={form.monto} placeholder="0" disabled={incomeBusy} onChange={e => setForm(p => ({...p,monto:e.target.value}))}/></div><div className="field"><label htmlFor="income-day">Día</label><input id="income-day" className="inf" type="number" inputMode="numeric" min="1" max={maxDay} step="1" required value={form.dia} disabled={incomeBusy} onChange={e => setForm(p => ({...p,dia:e.target.value}))}/></div></div>
        <button className="primary full-width" disabled={incomeBusy}>{incomeBusy ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Registrar ingreso'}<UiIcon name="check" size={18}/></button>
        {form.id && <button type="button" className="text-button cancel-edit" disabled={incomeBusy} onClick={() => setForm({fuente:'',monto:'',dia:'1'})}>Cancelar edición</button>}
      </form>
    </section>
    <section className="home-section"><h2>Ingresos registrados</h2><div className="surface income-list">{[...items].sort((a,b) => Number(b.dia)-Number(a.dia)).map(item => <article className="income-item" key={item.id}><div className="section-line"><span className="row-copy"><strong>{normalizarFuenteIngreso(item.fuente)}</strong><small>Día {item.dia}</small></span><strong className="money">{fmtARS(item.monto)}</strong></div><div className="row-actions"><button className="text-button" onClick={() => onEdit(item)}><UiIcon name="edit" size={16}/>Editar</button><button className="text-button delete-link" onClick={() => onDelete({...item,tipo:'ingresos',servicio:normalizarFuenteIngreso(item.fuente)})}><UiIcon name="trash" size={16}/>Eliminar</button></div></article>)}{!items.length && <p className="quiet-state">Los ingresos extra que cargues van a aparecer acá.</p>}</div></section>
  </div>;
}
