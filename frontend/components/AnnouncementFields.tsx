import { Field } from '@/components/Field';

/** E'lon yaratish va tahrirlash uchun umumiy maydonlar. */
export function AnnouncementFields() {
  return (
    <div className="form-grid">
      <Field label="Sarlavha" wide>
        <input className="input" name="title" />
      </Field>
      <Field label="Matn" wide>
        <textarea className="input" name="body" rows={6} />
      </Field>
      <label className="check">
        <input type="checkbox" name="isImportant" />
        {"Muhim e'lon (barcha a'zolarga bildirishnoma yuboriladi)"}
      </label>
    </div>
  );
}
