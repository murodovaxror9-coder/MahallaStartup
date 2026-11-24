import { Field } from '@/components/Field';

/** Tadbir yaratish va tahrirlash uchun umumiy maydonlar. */
export function EventFields() {
  return (
    <div className="form-grid">
      <Field label="Nomi" wide>
        <input className="input" name="title" />
      </Field>
      <Field label="Tavsif" wide>
        <textarea className="input" name="description" rows={4} />
      </Field>
      <Field label="Boshlanish vaqti">
        <input className="input" name="startsAt" type="datetime-local" />
      </Field>
      <Field label="Tugash vaqti (ixtiyoriy)">
        <input className="input" name="endsAt" type="datetime-local" />
      </Field>
      <Field label="Joy">
        <input className="input" name="location" />
      </Field>
      <Field label="Tashkilotchi">
        <input className="input" name="organizer" />
      </Field>
    </div>
  );
}
