/* Shared, browser-safe loop arithmetic; also exercised by the regression tests. */
globalThis.NoziqueCategoryLoop = {
  modulo(value, length) {
    return ((value % length) + length) % length;
  },
  wrap(position, cycle, origin) {
    if (cycle <= 0) return position;
    return origin + this.modulo(position - origin, cycle);
  },
  index(position, step, count) {
    return this.modulo(Math.round(position / step), count);
  },
};
