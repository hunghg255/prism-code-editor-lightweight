export const isClient = () => {
  try {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  } catch (error) {
    return false;
  }
}
