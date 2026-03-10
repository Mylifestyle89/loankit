const data = { 'custom.A.B': 1, 'Ban_lanh_dao': [{ 'custom.bld.stt': 1 }] };
function unflatten(data) {
  const result = {};
  for (const key of Object.keys(data)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = parts[i + 1];
      const nextIsArray = !Number.isNaN(Number(next));
      if (Array.isArray(current)) {
        const index = Number(part);
        if (!current[index]) current[index] = nextIsArray ? [] : {};
        current = current[index];
        continue;
      }
      if (!(part in current)) current[part] = nextIsArray ? [] : {};
      current = current[part];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current[Number(last)] = data[key];
    } else {
      current[last] = data[key];
    }
  }
  return result;
}
console.log(JSON.stringify(unflatten(data), null, 2));
