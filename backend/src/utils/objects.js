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

export { serialize, deserialize };
