function serialize(myData) {
  return Object.fromEntries(
    Object.entries(myData).map(([k, v]) => [
      k,
      v === undefined ? "__undefined__" : JSON.stringify(v),
    ])
  );
}

function deserialize(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "__undefined__" ? undefined : JSON.parse(v)])
  );
}

function safeParse(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") {
      // Already a non-string value, just copy as-is
      result[key] = value;
      continue;
    }

    try {
      // Try to parse if it looks like JSON
      if (
        value.startsWith("{") ||
        value.startsWith("[") ||
        value === "true" ||
        value === "false" ||
        !isNaN(value)
      ) {
        result[key] = JSON.parse(value);
      } else {
        result[key] = value;
      }
    } catch {
      // If it fails to parse, just keep the original string
      result[key] = value;
    }
  }

  return result;
}

export { serialize, deserialize, safeParse };
