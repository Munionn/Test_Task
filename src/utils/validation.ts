/**
 * Проверка, является ли строка валидным email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Проверка, является ли строка валидным номером телефона
 * Поддерживает форматы: +1234567890, 1234567890, (123) 456-7890 и т.д.
 */
export function isValidPhone(phone: string): boolean {
  // Удаляем все нецифровые символы кроме +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Проверяем, что осталось от 10 до 15 цифр (с учетом +)
  const phoneRegex = /^\+?\d{10,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Проверка, является ли строка email или номером телефона
 */
export function isValidIdentifier(identifier: string): boolean {
  return isValidEmail(identifier) || isValidPhone(identifier);
}

/**
 * Валидация пароля (минимум 6 символов)
 */
export function isValidPassword(password: string): boolean {
  return !!(password && password.length >= 6);
}

