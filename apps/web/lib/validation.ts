export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  // Matches mobile (03/05/07/08/09 or +84 + 9 digits) and landline (02 or +84 + 10 digits) numbers
  const regex = /^(0|\+84)(3|5|7|8|9)\d{8}$|^(0|\+84)2\d{9}$/;
  return regex.test(phone.trim().replace(/\s+/g, ""));
}
