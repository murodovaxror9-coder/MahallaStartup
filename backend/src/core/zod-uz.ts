import { z } from 'zod';

// Sxemada o'zbekcha xabar berilmagan hollar uchun umumiy xabarlar.
z.config({
  customError: (iss) => {
    switch (iss.code) {
      case 'invalid_type':
        return iss.input === undefined ? 'Majburiy maydon' : "Qiymat turi noto'g'ri";
      case 'too_small': {
        const min = String(iss.minimum);
        if (iss.origin === 'string') return `Kamida ${min} belgi bo'lsin`;
        if (iss.origin === 'array') return `Kamida ${min} ta element bo'lsin`;
        return `Qiymat kamida ${min} bo'lsin`;
      }
      case 'too_big': {
        const max = String(iss.maximum);
        if (iss.origin === 'string') return `Ko'pi bilan ${max} belgi bo'lsin`;
        if (iss.origin === 'array') return `Ko'pi bilan ${max} ta element bo'lsin`;
        return `Qiymat ko'pi bilan ${max} bo'lsin`;
      }
      case 'invalid_format':
        return "Format noto'g'ri";
      case 'invalid_value':
        return 'Ruxsat etilmagan qiymat';
      default:
        return undefined;
    }
  },
});
