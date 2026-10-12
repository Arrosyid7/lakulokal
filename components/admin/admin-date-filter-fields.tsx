import { adminDatePeriods, type AdminDatePeriod } from "@/lib/admin-date-range";

type AdminDateFilterFieldsProps = {
  idPrefix: string;
  period: AdminDatePeriod;
  fromDate: string;
  toDate: string;
  periodLabel: string;
};

export function AdminDateFilterFields({
  idPrefix,
  period,
  fromDate,
  toDate,
  periodLabel
}: AdminDateFilterFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-period`}>{periodLabel}</label>
        <select id={`${idPrefix}-period`} name="period" defaultValue={period}>
          <option value={adminDatePeriods[0]}>Semua tanggal</option>
          <option value={adminDatePeriods[1]}>Hari ini</option>
          <option value={adminDatePeriods[2]}>Minggu ini</option>
          <option value={adminDatePeriods[3]}>Bulan ini</option>
          <option value={adminDatePeriods[4]}>Rentang tanggal</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-from`}>Dari tanggal</label>
        <input id={`${idPrefix}-from`} type="date" name="from" defaultValue={fromDate} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-to`}>Sampai tanggal</label>
        <input id={`${idPrefix}-to`} type="date" name="to" defaultValue={toDate} />
      </div>
    </>
  );
}
