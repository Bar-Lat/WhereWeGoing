const toISO = (ddmmyyyy) => {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return null;
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
};

module.exports = { toISO };
