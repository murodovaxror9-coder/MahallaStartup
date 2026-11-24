import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  /** So'rov kelgan manzil (`http://10.0.2.2:3000`): lokal saqlash URL'lari shu asosda quriladi */
  baseUrl: string;
}

/**
 * Lokal saqlashdagi imzoli URL'lar so'rovning o'z host'iga qaratiladi: Android emulyator (`10.0.2.2`),
 * real qurilma (LAN IP) va admin (Next proksi orqali) uchun qo'shimcha sozlamasiz ishlaydi.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();
