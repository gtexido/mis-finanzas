import UiIcon from './UiIcon';
import { expenseAttention, isAutomaticDebit, reviewLabel } from '../utils/paymentStatus';

export default function ExpenseBadges({item, showPaid = true}) {
  const status = expenseAttention(item), review = reviewLabel(item);
  return <div className="expense-badges">
    {(showPaid || status.kind !== 'paid') && <span className={`expense-badge ${status.kind}`}><UiIcon name={status.icon} size={14}/>{status.kind === 'review' && review ? review : status.label}</span>}
    {review && status.kind !== 'review' && <span className="expense-badge review"><UiIcon name="edit" size={14}/>{review}</span>}
    {isAutomaticDebit(item) && <span className="expense-badge automatic"><UiIcon name="repeat" size={14}/>Débito automático</span>}
  </div>;
}
